'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import SearchableSelect from '@/components/SearchableSelect';
import { Loader } from '@/components/Loader';

interface CalendarEvent {
  id: string;
  title: string;
  hours: number;
  count: number;
  start: string;
  end: string;
  client_id?: string;
  category?: string;
  notes?: string;
  originalDefaultNotes?: string;
  isCustomBd?: boolean;
  customBdName?: string;
  occurrences?: {
    title?: string;
    notes?: string;
    start: string;
    end: string;
    hours: number;
    isAlreadySaved?: boolean;
  }[];
  isClientGrouped?: boolean;
  originalEvents?: CalendarEvent[];
}

export default function CalendarImport({ 
  userId, month, onSuccess, onMissedCountChange 
}: { 
  userId: string; 
  month: string; 
  onSuccess: () => void; 
  onMissedCountChange?: (count: number) => void; 
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [startDate, setStartDate] = useState(() => `${month}-01`);
  const [endDate, setEndDate] = useState(() => {
    const [yr, mn] = month.split('-');
    const lastDay = new Date(parseInt(yr), parseInt(mn), 0).getDate();
    return `${month}-${lastDay.toString().padStart(2, '0')}`;
  });

  const [userRole, setUserRole] = useState('team');
  const [unlockedMonths, setUnlockedMonths] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  // Auto-default From date to the day after the last logged allocation
  useEffect(() => {
    const fetchLatestAllocationDate = async () => {
      if (!userId || !selectedMonth) return;
      try {
        const { data: allocs, error } = await supabase
          .from('allocations_weekly')
          .select('start_date')
          .eq('user_id', userId)
          .eq('month', selectedMonth);
        
        if (error) throw error;
        
        if (allocs && allocs.length > 0) {
          const dates = allocs.map(a => a.start_date);
          const maxDateStr = dates.reduce((max, curr) => curr > max ? curr : max, dates[0]);
          
          const parts = maxDateStr.split('-');
          const maxDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          maxDate.setDate(maxDate.getDate() + 1);
          
          // Generate local timezone-safe YYYY-MM-DD
          const y = maxDate.getFullYear();
          const m = (maxDate.getMonth() + 1).toString().padStart(2, '0');
          const d = maxDate.getDate().toString().padStart(2, '0');
          const nextDayStr = `${y}-${m}-${d}`;
          
          if (nextDayStr.startsWith(selectedMonth)) {
            setStartDate(nextDayStr);
          } else {
            setStartDate(`${selectedMonth}-01`);
          }
        } else {
          setStartDate(`${selectedMonth}-01`);
        }
      } catch (err) {
        console.warn('Failed to load latest allocation date:', err);
      }
    };
    
    fetchLatestAllocationDate();
  }, [userId, selectedMonth]);

  // Silently auto-fetch calendar events on mount / month change if Google token is active
  useEffect(() => {
    if (userId && selectedMonth && user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.provider_token) {
          handleFetch(true);
        }
      });
    }
  }, [userId, selectedMonth, user]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<CalendarEvent | null>(null);
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set());
  const [modalClientId, setModalClientId] = useState('');

  const openSameClientModal = (event: CalendarEvent) => {
    setModalTarget(event);
    setModalClientId(event.client_id || '');
    // Pre-select the target event in the group
    setModalSelectedIds(new Set([event.id]));
    setModalOpen(true);
  };

  const handleGroupTogether = () => {
    if (!modalClientId) {
      alert("Please select a client to group these events under.");
      return;
    }
    if (modalSelectedIds.size < 2) {
      alert("Please select at least two events to group together.");
      return;
    }

    const selectedEventsToMerge = events.filter(e => modalSelectedIds.has(e.id));
    
    // Find client name
    const clientObj = clients.find(c => c.id === modalClientId);
    const clientName = clientObj ? clientObj.name : 'Selected Client';

    // Merge occurrences
    const mergedOccurrences: any[] = [];
    let totalHours = 0;
    let totalCount = 0;
    let minStart = selectedEventsToMerge[0].start;
    let maxEnd = selectedEventsToMerge[0].end;
    const mergedTitles: string[] = [];

    selectedEventsToMerge.forEach(e => {
      totalHours += e.hours;
      totalCount += e.count;
      if (new Date(e.start) < new Date(minStart)) minStart = e.start;
      if (new Date(e.end) > new Date(maxEnd)) maxEnd = e.end;
      
      mergedTitles.push(e.title);

      if (e.occurrences && e.occurrences.length > 0) {
        // Map occurrences to carry the original event title and notes
        const mapped = e.occurrences.map(occ => ({
          title: occ.title || e.title,
          notes: occ.notes || e.notes || e.title,
          start: occ.start,
          end: occ.end,
          hours: occ.hours,
          isAlreadySaved: occ.isAlreadySaved
        }));
        mergedOccurrences.push(...mapped);
      } else {
        mergedOccurrences.push({
          title: e.title,
          notes: e.notes || e.title,
          start: e.start,
          end: e.end,
          hours: e.hours,
          isAlreadySaved: (e as any).isAlreadySaved
        });
      }
    });

    const uniqueMergedTitles = Array.from(new Set(mergedTitles));
    const defaultNotesStr = uniqueMergedTitles.join('; ');
    const newGroupedEvent: CalendarEvent = {
      id: `client_group_${Date.now()}`,
      title: `Grouped: ${uniqueMergedTitles.join(', ')}`,
      hours: totalHours,
      count: totalCount,
      start: minStart,
      end: maxEnd,
      client_id: modalClientId,
      category: selectedEventsToMerge[0].category || 'Meeting',
      notes: defaultNotesStr,
      originalDefaultNotes: defaultNotesStr,
      isClientGrouped: true,
      originalEvents: selectedEventsToMerge,
      occurrences: mergedOccurrences
    };

    // Remove merged events and append the new grouped event
    setEvents(prev => {
      const filtered = prev.filter(e => !modalSelectedIds.has(e.id));
      return [newGroupedEvent, ...filtered];
    });

    // Update selectedEvents: remove merged IDs, and add the new grouped event ID
    setSelectedEvents(prev => {
      const next = new Set(prev);
      modalSelectedIds.forEach(id => next.delete(id));
      next.add(newGroupedEvent.id);
      return next;
    });

    // Reset and close
    setModalOpen(false);
    setModalTarget(null);
    setModalSelectedIds(new Set());
    setModalClientId('');
  };

  const handleUngroup = (groupId: string) => {
    const groupEvent = events.find(e => e.id === groupId);
    if (!groupEvent || !groupEvent.originalEvents) return;

    const wasSelected = selectedEvents.has(groupId);

    // Restore original events and remove grouped event
    setEvents(prev => {
      const filtered = prev.filter(e => e.id !== groupId);
      return [...groupEvent.originalEvents!, ...filtered];
    });

    // If grouped card was checked, transfer check state to all original parts
    setSelectedEvents(prev => {
      const next = new Set(prev);
      next.delete(groupId);
      if (wasSelected) {
        groupEvent.originalEvents!.forEach(e => next.add(e.id));
      }
      return next;
    });
  };

  useEffect(() => {
    handleMonthChange(month);
  }, [month]);

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    if (value) {
      const [yr, mn] = value.split('-');
      const start = `${value}-01`;
      const lastDay = new Date(parseInt(yr), parseInt(mn), 0).getDate();
      const end = `${value}-${lastDay.toString().padStart(2, '0')}`;
      
      setStartDate(start);
      setEndDate(end);
    }
  };

  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  
  const selectOptions = [
    { value: '', label: 'Select Client...' },
    ...clients.map(c => ({ value: c.id, label: c.name }))
  ];

  const fetchUserRole = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/me`);
      if (response.ok) {
        const resData = await response.json();
        let role = resData.role || 'team';
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const email = user.email.toLowerCase();
          const CORE_EMAILS = [
            'archana@themavericksindia.com', 'arunkumar@themavericksindia.com', 'avinash@themavericksindia.com',
            'chetan@themavericksindia.com', 'developerteam@themavericksindia.com', 'divyanshsharma@themavericksindia.com',
            'gaurav@themavericksindia.com', 'mitali.p@themavericksindia.com', 'pooja@themavericksindia.com',
            'satyam.singh@themavericksindia.com', 'smriti@themavericksindia.com', 'tech@themavericksindia.com'
          ];
          const MANAGER_EMAILS = [
            'aashna@themavericksindia.com', 'akshay@themavericksindia.com', 'alisha@themavericksindia.com',
            'ananya@themavericksindia.com', 'anil@themavericksindia.com', 'chhavi.a@themavericksindia.com',
            'ila@themavericksindia.com', 'ishmeet@themavericksindia.com', 'kavita@themavericksindia.com',
            'mahek@themavericksindia.com', 'manaswi@themavericksindia.com', 'muskaan@themavericksindia.com',
            'pavithra@themavericksindia.com', 'rajvi@themavericksindia.com', 'samrat@themavericksindia.com',
            'shrestha@themavericksindia.com', 'srishtee@themavericksindia.com', 'vibhuti@themavericksindia.com'
          ];
          if (CORE_EMAILS.includes(email)) role = 'core';
          else if (MANAGER_EMAILS.includes(email) && role === 'team') role = 'manager';
        }
        setUserRole(role);
      }
    } catch (err) {
      console.error('Failed to fetch role:', err);
    }
  };

  const fetchUnlockedMonths = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months`);
      if (response.ok) {
        const monthsData = await response.json();
        setUnlockedMonths(monthsData.map((m: any) => m.month));
      }
    } catch (err) {
      console.error('Failed to fetch unlocked months:', err);
    }
  };
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.email) {
        fetchUserRole();
        fetchUnlockedMonths();
      }
    });
  }, []);

  useEffect(() => {
    fetchClients();
  }, [selectedMonth]);

  useEffect(() => {
    if (userRole === 'core') {
      setIsLocked(false);
      return;
    }
    
    if (!selectedMonth || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
      setIsLocked(false);
      return;
    }
    
    if (unlockedMonths.includes(selectedMonth)) {
      setIsLocked(false);
      return;
    }

    const [targetYear, targetMonth] = selectedMonth.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const diffMonths = (currentYear * 12 + currentMonth) - (targetYear * 12 + targetMonth);

    if (diffMonths <= 0) {
      setIsLocked(false);
    } else if (diffMonths === 1) {
      setIsLocked(currentDay >= 5);
    } else {
      setIsLocked(true);
    }
  }, [selectedMonth, userRole, unlockedMonths]);

  const fetchClients = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients?month=${selectedMonth}`);
      const data = await response.json();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };


  const handleLoginRefresh = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly'
      },
    });
  };

  const handleFetch = async (isAuto = false) => {
    setLoading(true);
    setHasFetched(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const googleToken = session?.provider_token;
      
      if (!googleToken) {
        setLoading(false);
        if (!isAuto) {
          if (confirm('🚨 Your Google Session has expired. Would you like to refresh it now to fetch calendar events?')) {
            handleLoginRefresh();
          }
        }
        return;
      }

      const response = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/calendar/events?accessToken=${googleToken}&startDate=${startDate}&endDate=${endDate}`
      );
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      // Fetch existing weekly allocations to check for duplicate entries
      let existingAllocations: any[] = [];
      try {
        const { data: allocs, error: supabaseError } = await supabase
          .from('allocations_weekly')
          .select('*, clients(name)')
          .eq('user_id', userId)
          .eq('month', selectedMonth);

        if (supabaseError) throw supabaseError;
        existingAllocations = allocs || [];
      } catch (err) {
        console.warn('Could not fetch existing allocations for duplicate check:', err);
      }

      // Find the 'Internal' client ID for default
      const internalClient = clients.find(c => c.name.toLowerCase() === 'internal');
      const fallbackClientId = internalClient?.id || ''; 

      // Initialize events with default client, category, and event title as notes
      const initializedEvents = data.map((ev: any, index: number) => {
        let bestMatch: typeof clients[0] | null = null;
        let bestScore = -1;

        const titleLower = ev.title.toLowerCase();

        for (const c of clients) {
          const clientNameLower = c.name.toLowerCase();
          
          let isMatch = false;
          let matchTypeWeight = 0; // 1000 for exact phrase, 500 for token-based

          // 1. Check exact phrase match
          if (titleLower.includes(clientNameLower)) {
            isMatch = true;
            matchTypeWeight = 1000;
          } else {
            // 2. Check token-based match (all words in client name are present in title)
            const clientWords = clientNameLower.split(/[\s_\-\/]+/).filter(w => w.length > 1);
            if (clientWords.length > 0) {
              const matchingWords = clientWords.filter(word => titleLower.includes(word));
              if (matchingWords.length === clientWords.length) {
                isMatch = true;
                matchTypeWeight = 500;
              }
            }
          }

          if (isMatch) {
            // Calculate Category Priority
            let categoryPriority = 100; // Default generic (Internal, LEAVE, etc.)
            
            const isGenericInternalOrLeave = [
              'internal', 'leave', 'free_time', 'free time', 'personal commitments'
            ].includes(clientNameLower) || clientNameLower.startsWith('group internal');

            const isSpecificInternal = clientNameLower.includes('internal') && !isGenericInternalOrLeave;

            const isBDClient = clientNameLower.startsWith('bd -') || clientNameLower.startsWith('bd ');
            const isGenericBD = clientNameLower === 'bd';

            if (isBDClient) {
              categoryPriority = 10000; // Highest priority for proper specific BD clients
            } else if (!isGenericInternalOrLeave && !isSpecificInternal && !isGenericBD) {
              categoryPriority = 5000;  // High priority for normal proper clients (e.g. Google)
            } else if (isGenericBD) {
              categoryPriority = 1000;  // Medium priority for generic BD
            } else if (isSpecificInternal) {
              categoryPriority = 500;   // Medium-low priority for specific internal groups
            }

            // Calculate overall score
            // Score = Category Priority + Match Type Weight + Length Specificity
            const score = categoryPriority + matchTypeWeight + (clientNameLower.length * 10);

            if (score > bestScore) {
              bestScore = score;
              bestMatch = c;
            }
          }
        }

        // Map occurrences and determine which ones are already saved
        const processedOccurrences = (ev.occurrences || []).map((occ: any) => {
          const occDateStr = occ.start.split('T')[0];
          const occHours = Number(occ.hours);
          const occTitleLower = (occ.title || ev.title || '').toLowerCase().trim();

          const isAlreadySaved = existingAllocations.some((alloc: any) => {
            const allocDateStr = alloc.start_date; // YYYY-MM-DD
            const allocHours = Number(alloc.hours);
            const allocNotesLower = (alloc.notes || '').toLowerCase().trim();

            const datesMatch = allocDateStr === occDateStr;
            const hoursMatch = Math.abs(allocHours - occHours) < 0.05;
            
            // Check for hidden [cal: title] tag or direct matching
            const hasHiddenTag = allocNotesLower.includes(`[cal: ${occTitleLower}]`);
            const notesMatch = hasHiddenTag ||
                               allocNotesLower === occTitleLower || 
                               allocNotesLower.includes(occTitleLower) || 
                               occTitleLower.includes(allocNotesLower);

            return datesMatch && hoursMatch && notesMatch;
          });

          return {
            ...occ,
            isAlreadySaved
          };
        });

        // Recalculate duration and count
        const totalHours = processedOccurrences.reduce((sum: number, o: any) => sum + Number(o.hours), 0);
        const count = processedOccurrences.length;

        return {
          ...ev,
          id: `${ev.title}_${index}`,
          client_id: bestMatch ? bestMatch.id : fallbackClientId,
          category: '', // Empty default
          notes: ev.title, // Default notes to event title
          originalDefaultNotes: ev.title,
          occurrences: processedOccurrences,
          hours: totalHours,
          count: count
        };
      });

      setEvents(initializedEvents);
      setHasFetched(true);

      // Calculate missed calendar events on or before the latest logged allocation
      let latestAllocDateStr = '';
      if (existingAllocations && existingAllocations.length > 0) {
        const dates = existingAllocations.map((a: any) => a.start_date);
        latestAllocDateStr = dates.reduce((max: string, curr: string) => curr > max ? curr : max, dates[0]);
      }

      let missedCount = 0;
      if (latestAllocDateStr) {
        initializedEvents.forEach((ev: any) => {
          if (ev.occurrences && ev.occurrences.length > 0) {
            ev.occurrences.forEach((occ: any) => {
              const occDateStr = occ.start.split('T')[0];
              if (occDateStr <= latestAllocDateStr && !occ.isAlreadySaved) {
                missedCount++;
              }
            });
          } else {
            const evDateStr = ev.start.split('T')[0];
            if (evDateStr <= latestAllocDateStr && !ev.isAlreadySaved) {
              missedCount++;
            }
          }
        });
      }

      if (onMissedCountChange) {
        onMissedCountChange(missedCount);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selected = events.filter(e => selectedEvents.has(e.id));
      
      if (selected.length === 0) return;

      // Check for already allocated events and show confirmation popup
      const alreadySavedList: string[] = [];
      for (const event of selected) {
        if (event.occurrences && event.occurrences.length > 0) {
          for (const occ of event.occurrences) {
            if (occ.isAlreadySaved) {
              alreadySavedList.push(`• "${occ.title || event.title}" on ${occ.start.split('T')[0]}`);
            }
          }
        }
      }

      if (alreadySavedList.length > 0) {
        const confirmMessage = `The following event(s) are already allocated:\n\n${alreadySavedList.join('\n')}\n\nDo you still want to add them anyway?`;
        if (!window.confirm(confirmMessage)) {
          setSaving(false);
          return;
        }
      }

      const totalSavedCount = selected.reduce((sum, e) => sum + (e.count || 1), 0);

      // Validate both populated
      const bothPopulated = selected.find(e => e.client_id && e.customBdName?.trim());
      if (bothPopulated) {
        throw new Error(`For event "${bothPopulated.title}", you have selected a client from the dropdown AND entered a custom BD client name. Please use only one of these options.`);
      }

      // Validate neither populated
      const neitherPopulated = selected.find(e => !e.client_id && !e.customBdName?.trim());
      if (neitherPopulated) {
        throw new Error(`Please select a client or enter a custom BD name for "${neitherPopulated.title}".`);
      }

      const eventsToSave = [...selected];
      const updatedClientsList = [...clients];

      for (const event of eventsToSave) {
        if (event.customBdName?.trim()) {
          const bdName = `BD - ${event.customBdName.trim()}`;
          
          const createRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: bdName })
          });

          if (!createRes.ok) {
            const errData = await createRes.json();
            throw new Error(errData.error || `Failed to create client "${bdName}"`);
          }

          const newClient = await createRes.json();
          event.client_id = newClient.id;

          if (!updatedClientsList.some(c => c.id === newClient.id)) {
            updatedClientsList.push(newClient);
          }
        }
      }

      // Sort and update the clients state so they immediately show in all dropdowns
      updatedClientsList.sort((a, b) => a.name.localeCompare(b.name));
      setClients(updatedClientsList);

      for (const event of eventsToSave) {
        if (event.occurrences && event.occurrences.length > 0) {
          for (const occ of event.occurrences) {
            const isNotesCustomized = event.notes !== event.originalDefaultNotes;
            const baseNotes = isNotesCustomized ? (event.notes || '') : (occ.notes || occ.title || event.title);
            const finalNotes = `${baseNotes}\n[Cal: ${occ.title || event.title}]`;

            const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/weekly`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: userId,
                month: selectedMonth,
                client_id: event.client_id, 
                category: event.category,
                hours: occ.hours,
                notes: finalNotes, 
                start_date: occ.start.split('T')[0],
                end_date: occ.end.split('T')[0],
                source: 'calendar',
                force: true
              })
            });
            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || `Failed to save event "${event.title}"`);
            }
          }
        } else {
          const finalNotes = `${event.notes || event.title}\n[Cal: ${event.title}]`;
          const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/weekly`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              month: selectedMonth,
              client_id: event.client_id, 
              category: event.category,
              hours: event.hours,
              notes: finalNotes, 
              start_date: event.start.split('T')[0],
              end_date: event.end.split('T')[0],
              source: 'calendar',
              force: true
            })
          });
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Failed to save event "${event.title}"`);
          }
        }
      }
      onSuccess();
      setSelectedEvents(new Set());
      setEvents([]);
      setHasFetched(false);
      alert(`Successfully saved ${totalSavedCount} events!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedEvents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEvents(next);
  };

  const updateEventDetails = (id: string, field: string, value: string) => {
    setEvents(prev => prev.map(ev => 
      ev.id === id ? { ...ev, [field]: value } : ev
    ));
  };

  const toggleSelectAll = () => {
    if (selectedEvents.size === events.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(events.map(e => e.id)));
    }
  };

  const dismissEvent = (id: string) => {
    setEvents(prev => prev.filter(ev => ev.id !== id));
    setSelectedEvents(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const getSelectedConstituentCount = () => {
    let count = 0;
    events.forEach(e => {
      if (selectedEvents.has(e.id)) {
        count += e.count || 1;
      }
    });
    return count;
  };

  const getTotalConstituentCount = () => {
    let count = 0;
    events.forEach(e => {
      count += e.count || 1;
    });
    return count;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Title & Icon Header Band */}
      <div className="p-8 pb-6 border-b border-slate-100 bg-blue-50/20 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-2xl">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Calendar Import</h3>
          <p className="text-sm text-slate-500">Fetch and customize your meetings.</p>
        </div>
      </div>
      
      {/* Aligned Controls Action Band */}
      <div className="px-8 py-5 bg-slate-50/40 border-b border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Selected Month Selector */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Selected Month</span>
            <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[38px] lg:h-[42px] items-center">
               <select 
                 value={selectedMonth.split('-')[1]} 
                 onChange={(e) => {
                   const newMonth = e.target.value;
                   const year = selectedMonth.split('-')[0];
                   handleMonthChange(`${year}-${newMonth}`);
                 }}
                 className="pl-4 pr-2 py-2 text-sm font-bold text-slate-900 bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
               >
                 {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                   <option key={m} value={m}>{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'short' })}</option>
                 ))}
               </select>
               <div className="w-[1px] bg-slate-200 h-5 my-auto" />
               <select 
                 value={selectedMonth.split('-')[0]} 
                 onChange={(e) => {
                   const newYear = e.target.value;
                   const mon = selectedMonth.split('-')[1];
                   handleMonthChange(`${newYear}-${mon}`);
                 }}
                 className="pl-2 pr-4 py-2 text-sm font-bold text-blue-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
               >
                 {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                   <option key={y} value={y}>{y}</option>
                 ))}
               </select>
            </div>
          </div>

          {/* Date Picker inputs (From / To) */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">From</span>
              <input 
                type="date" 
                value={startDate}
                min={`${selectedMonth}-01`}
                max={`${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate().toString().padStart(2, '0')}`}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none w-36 lg:w-40 shadow-sm h-[38px] lg:h-[42px] cursor-pointer"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">To</span>
              <input 
                type="date" 
                value={endDate}
                min={`${selectedMonth}-01`}
                max={`${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate().toString().padStart(2, '0')}`}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none w-36 lg:w-40 shadow-sm h-[38px] lg:h-[42px] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Fetch Action Button */}
        <div className="flex flex-col w-full md:w-auto mt-2 md:mt-0">
          <button 
            onClick={() => {
              if (isLocked) {
                alert("Monthly Submissions Locked: The selected month is locked. You cannot import calendar events for locked months.");
                return;
              }
              handleFetch();
            }}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 h-[38px] lg:h-[42px] w-full md:w-auto"
          >
            {loading ? <Loader size="sm" inline /> : 'Fetch Events'}
          </button>
        </div>
      </div>

      <div className="p-8">
        {events.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              {hasFetched ? <AlertCircle className="w-8 h-8 text-amber-500" /> : <Download className="w-8 h-8 text-slate-300" />}
            </div>
            <p className="text-slate-500 max-w-xs">{hasFetched ? "No events found for this month." : "Click fetch to see your calendar events."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select/Deselect and Ignore Controls */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-4 py-2 rounded-xl transition-all border border-blue-100 flex items-center gap-1.5"
                >
                  {selectedEvents.size === events.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs font-semibold text-slate-400">
                  {(() => {
                    const selCount = getSelectedConstituentCount();
                    const totCount = getTotalConstituentCount();
                    return `${selCount} of ${totCount} meetings selected`;
                  })()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to dismiss all selected events?')) {
                     const selectedIds = new Set(selectedEvents);
                     setEvents(prev => prev.filter(ev => !selectedIds.has(ev.id)));
                     setSelectedEvents(new Set());
                  }
                }}
                disabled={selectedEvents.size === 0}
                className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/70 px-4 py-2 rounded-xl transition-all border border-red-100 disabled:opacity-50 flex items-center gap-1.5"
              >
                Dismiss Selected
              </button>
            </div>

            {events.map((event) => (
              <div 
                key={event.id}
                onClick={() => toggleSelect(event.id)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col gap-4 ${selectedEvents.has(event.id) ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${selectedEvents.has(event.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{event.title}</h4>
                      <p className="text-xs text-slate-500">
                        <span className="font-bold text-blue-600 mr-2">
                          {(() => {
                            const startDateStr = new Date(event.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            const endDateStr = new Date(event.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;
                          })()}
                        </span>
                        • {event.count} {event.count === 1 ? 'meeting' : 'meetings'} • {event.hours.toFixed(2)}h total
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {event.isClientGrouped ? (
                      <button
                        type="button"
                        onClick={() => handleUngroup(event.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-3 py-1.5 rounded-xl border border-rose-100 transition-all cursor-pointer"
                      >
                        Ungroup
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openSameClientModal(event)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl border border-indigo-100 transition-all cursor-pointer"
                      >
                        Same Client?
                      </button>
                    )}
                    <span className="text-sm font-mono font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100">{event.hours.toFixed(2)}h</span>
                    <button
                      type="button"
                      onClick={() => dismissEvent(event.id)}
                      className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-all border border-slate-100 hover:border-red-100"
                      title="Dismiss Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {selectedEvents.has(event.id) && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Client (Dropdown)</label>
                      <SearchableSelect 
                        options={selectOptions}
                        value={event.client_id || ''}
                        onChange={(val) => updateEventDetails(event.id, 'client_id', val)}
                        placeholder="Select Client"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Or Add as BD (Manual)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">BD -</span>
                        <input 
                          type="text" 
                          value={event.customBdName || ''} 
                          onChange={(e) => updateEventDetails(event.id, 'customBdName', e.target.value)} 
                          placeholder="Client Name" 
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 h-[38px]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Category</label>
                      <input type="text" value={event.category} onChange={(e) => updateEventDetails(event.id, 'category', e.target.value)} placeholder="Meeting / Internal / Billable" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none h-[38px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Notes (Optional)</label>
                      <input type="text" value={event.notes} onChange={(e) => updateEventDetails(event.id, 'notes', e.target.value)} placeholder="Notes" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none h-[38px]" />
                    </div>
                  </div>
                )}
              </div>
            ))}`
            
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold">Overlap check enabled</span>
              </div>
              <button 
                onClick={() => {
                  if (isLocked) {
                    alert("Monthly Submissions Locked: The selected month is locked. You cannot save calendar events for locked months.");
                    return;
                  }
                  handleSave();
                }}
                disabled={saving || selectedEvents.size === 0}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader size="sm" inline />}
                {saving ? 'Saving...' : `Save ${getSelectedConstituentCount()} Events`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Group under Same Client Modal */}
      {modalOpen && modalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/20">
              <div>
                <h4 className="text-base font-bold text-slate-900">Group Events under Same Client</h4>
                <p className="text-xs text-slate-500 mt-0.5">Select a client and combine different meetings together.</p>
              </div>
              <button 
                onClick={() => {
                  setModalOpen(false);
                  setModalTarget(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[350px]">
              {/* Step 1: Select Client */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Step 1: Select Target Client</label>
                <SearchableSelect 
                  options={selectOptions}
                  value={modalClientId}
                  onChange={(val) => setModalClientId(val)}
                  placeholder="Choose a Client..."
                />
              </div>

              {/* Step 2: Choose events to merge */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Step 2: Check Events to Group Together</label>
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 max-h-[180px] overflow-y-auto bg-slate-50/50 p-2 space-y-1">
                  {events
                    .filter(e => !e.isClientGrouped)
                    .map(e => {
                      const isChecked = modalSelectedIds.has(e.id);
                      return (
                        <label 
                          key={e.id}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-white hover:shadow-sm cursor-pointer transition-all border border-transparent hover:border-slate-100/60"
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const next = new Set(modalSelectedIds);
                                if (next.has(e.id)) next.delete(e.id);
                                else next.add(e.id);
                                setModalSelectedIds(next);
                              }}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 block leading-tight">{e.title}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{e.hours.toFixed(2)}h total</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {modalSelectedIds.size} events selected
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setModalOpen(false);
                    setModalTarget(null);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleGroupTogether}
                  disabled={!modalClientId || modalSelectedIds.size < 2}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer"
                >
                  Group Together
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
