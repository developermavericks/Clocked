'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, User, Clock, Briefcase, Calendar, AlertCircle, Mail, Send, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import SearchableSelect from '@/components/SearchableSelect';
import { Loader, ErrorDisplay } from '@/components/Loader';



export default function MemberInsights({ month: initialMonth, onMonthChange }: { month: string; onMonthChange?: (month: string) => void }) {
  const [internalMonth, setInternalMonth] = useState(initialMonth);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [memberData, setMemberData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setExpandedClients({});
    setSearchQuery('');
  }, [selectedEmail, internalMonth]);

  const toggleClientExpand = (clientName: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }));
  };

  useEffect(() => {
    fetchDbUsers();
  }, []);

  useEffect(() => {
    setInternalMonth(initialMonth);
  }, [initialMonth]);

  const fetchDbUsers = async () => {
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/all`);
      const users = await res.json();
      if (Array.isArray(users)) {
        setDbUsers(users);
      }
    } catch (err) {
      console.error('Failed to fetch DB users:', err);
    }
  };

  // Parse internalMonth into year and month index
  const currentYear = internalMonth.split('-')[0];
  const currentMonth = internalMonth.split('-')[1];

  const handleMonthChange = (newMonth: string) => {
    const nextMonth = `${currentYear}-${newMonth}`;
    setInternalMonth(nextMonth);
    if (onMonthChange) {
      onMonthChange(nextMonth);
    }
  };

  const handleYearChange = (newYear: string) => {
    const nextMonth = `${newYear}-${currentMonth}`;
    setInternalMonth(nextMonth);
    if (onMonthChange) {
      onMonthChange(nextMonth);
    }
  };

  const fetchMemberReport = async () => {
    if (!selectedEmail) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/member?email=${selectedEmail}&month=${internalMonth}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report');
      }

      setMemberData(data.allocations || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      console.error('Failed to fetch member report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmail) {
      fetchMemberReport();
    }
  }, [selectedEmail, internalMonth]);

  // Logic for Zero Hour Members
  const [zeroHourMembers, setZeroHourMembers] = useState<string[]>([]);
  const [zeroHourLoading, setZeroHourLoading] = useState(true);
  const [zeroHourError, setZeroHourError] = useState<string | null>(null);
  
  useEffect(() => {
    if (dbUsers.length > 0) {
      fetchZeroHourMembers();
    }
  }, [internalMonth, dbUsers]);

  const fetchZeroHourMembers = async () => {
    setZeroHourLoading(true);
    setZeroHourError(null);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/zero-hours?month=${internalMonth}`);
      if (!res.ok) {
        throw new Error('Failed to load zero hour members. Please try again.');
      }
      const activeEmails = await res.json();
      const zeroList = dbUsers
        .filter((u: any) => {
          if (!u.is_active) return false;
          if (u.exit_date) {
            const exitMonth = u.exit_date.substring(0, 7);
            if (exitMonth < internalMonth) return false;
          }
          const emailLower = u.email ? u.email.toLowerCase().trim() : '';
          if (emailLower === 'avinash@themavericksindia.com' || emailLower === 'satyam.singh@themavericksindia.com') {
            return false;
          }
          return true;
        })
        .map((u: any) => u.email.toLowerCase())
        .filter(email => !activeEmails.includes(email));

      setZeroHourMembers(zeroList);
    } catch (err: any) {
      console.error('Failed to fetch zero hour members:', err);
      setZeroHourError(err.message || 'Failed to load zero hour members. Please try again.');
    } finally {
      setZeroHourLoading(false);
    }
  };

  // State for email notifications
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingClosure, setSendingClosure] = useState(false);
  const [sendingIndividual, setSendingIndividual] = useState<Record<string, boolean>>({});
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});

  const handleSendIndividualReminder = async (email: string) => {
    setSendingIndividual(prev => ({ ...prev, [email]: true }));
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, month: internalMonth })
      });
      if (response.ok) {
        setSentStatus(prev => ({ ...prev, [email]: true }));
        setTimeout(() => {
          setSentStatus(prev => ({ ...prev, [email]: false }));
        }, 5000);
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to send reminder.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to server.');
    } finally {
      setSendingIndividual(prev => ({ ...prev, [email]: false }));
    }
  };

  const handleSendBulkReminders = async () => {
    if (zeroHourMembers.length === 0) return;
    if (!confirm(`Are you sure you want to send email reminders to all ${zeroHourMembers.length} members with 0 logged hours?`)) return;

    setSendingAll(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/remind-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ month: internalMonth })
      });
      if (response.ok) {
        alert('All weekly reminders successfully dispatched!');
        const nextSent: Record<string, boolean> = {};
        zeroHourMembers.forEach(email => {
          nextSent[email] = true;
        });
        setSentStatus(nextSent);
        setTimeout(() => {
          setSentStatus({});
        }, 5000);
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to send bulk reminders.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to server.');
    } finally {
      setSendingAll(false);
    }
  };

  const handleSendClosureReminders = async () => {
    if (zeroHourMembers.length === 0) return;
    const confirmMsg = `⚠️ CRITICAL ACTION: Are you sure you want to send the FINAL CLOSURE NOTICE to all ${zeroHourMembers.length} members with 0 logged hours? \n\nThis will send a strict warning email and automatically CC the 4 executive team members.`;
    if (!confirm(confirmMsg)) return;

    setSendingClosure(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/remind-closure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ month: internalMonth })
      });
      if (response.ok) {
        alert('Final monthly closure reminders successfully dispatched with Executive CC!');
        const nextSent: Record<string, boolean> = {};
        zeroHourMembers.forEach(email => {
          nextSent[email] = true;
        });
        setSentStatus(nextSent);
        setTimeout(() => {
          setSentStatus({});
        }, 5000);
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to send closure reminders.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to server.');
    } finally {
      setSendingClosure(false);
    }
  };

  const formatPeriod = (start?: string, end?: string) => {
    if (!start) return '';
    if (!end || start === end) {
      try {
        const date = new Date(start.replace(/-/g, '/'));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return start;
      }
    }
    try {
      const startDate = new Date(start.replace(/-/g, '/'));
      const endDate = new Date(end.replace(/-/g, '/'));
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return `${start} – ${end}`;
    }
  };

  const filteredMemberData = useMemo(() => {
    if (!searchQuery) return memberData;
    const query = searchQuery.toLowerCase().trim();
    return memberData.filter(item => {
      const notesMatch = (item.notes || '').toLowerCase().includes(query);
      const clientMatch = (item.clients?.name || '').toLowerCase().includes(query);
      const categoryMatch = (item.category || '').toLowerCase().includes(query);
      const sourceMatch = (item.source || '').toLowerCase().includes(query);
      return notesMatch || clientMatch || categoryMatch || sourceMatch;
    });
  }, [memberData, searchQuery]);

  const groupedData = useMemo(() => {
    const groups: Record<string, { clientName: string; totalHours: number; items: any[] }> = {};
    filteredMemberData.forEach(item => {
      const clientName = item.clients?.name || 'Unknown Client';
      if (!groups[clientName]) {
        groups[clientName] = {
          clientName,
          totalHours: 0,
          items: []
        };
      }
      groups[clientName].totalHours += Number(item.hours) || 0;
      groups[clientName].items.push(item);
    });

    const result = Object.values(groups).sort((a, b) => a.clientName.localeCompare(b.clientName));
    
    // Sort items chronologically (ascending) by start_date inside each client group
    result.forEach(group => {
      group.items.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    });

    return result;
  }, [filteredMemberData]);

  const totalHours = memberData.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  const filteredTotalHours = useMemo(() => {
    return filteredMemberData.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  }, [filteredMemberData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Controls */}
      <div className="bg-white rounded-[32px] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Select Member</label>
              <SearchableSelect 
                options={dbUsers
                  .filter((u: any) => {
                    if (!u.is_active) return false;
                    if (u.exit_date) {
                      const exitMonth = u.exit_date.substring(0, 7);
                      if (exitMonth < internalMonth) return false;
                    }
                    return true;
                  })
                  .sort((a, b) => (a.email || '').localeCompare(b.email || ''))
                  .map((u: any) => ({ 
                    value: u.email.toLowerCase(), 
                    label: u.email.toLowerCase()
                  }))}
                value={selectedEmail}
                onChange={(val) => setSelectedEmail(val)}
                placeholder="Choose a member..."
                triggerClassName="bg-slate-50 border-slate-200 text-slate-900 focus:ring-4 focus:ring-orange-500/20"
              />
          </div>

          <div className="space-y-3 lg:col-span-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Reporting Period</label>
             <div className="flex gap-2">
                <select 
                  value={currentMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="flex-1 bg-slate-50 border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-bold outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer appearance-none"
                >
                  {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(m => (
                    <option key={m} value={m} className="bg-white text-slate-900 font-semibold">
                      {new Date(`2025-${m}-02`).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select 
                  value={currentYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="bg-slate-50 border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-bold outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer appearance-none"
                >
                  {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                    <option key={y} value={y.toString()} className="bg-white text-slate-900 font-semibold">
                      {y}
                    </option>
                  ))}
                </select>
             </div>
          </div>

          <div>
            <button 
              onClick={fetchMemberReport}
              disabled={!selectedEmail || loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
            >
              {loading ? <Loader size="sm" inline /> : <Search className="w-5 h-5" />}
              LOAD REPORT
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 whitespace-nowrap">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Work Log Summary
                </h3>
                {memberData.length > 0 && (
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="text"
                      placeholder="Search events/clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {searchQuery.trim() && (
                  <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded-xl text-xs font-black">
                    Matched: {filteredTotalHours.toFixed(1)}h
                  </div>
                )}
                <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase">
                  {new Date(internalMonth + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black">
                  Total: {totalHours.toFixed(1)}h
                </div>
              </div>
            </div>

            <div className="p-0">
              {error ? (
                <div className="p-8">
                  <ErrorDisplay message={error} onRetry={fetchMemberReport} />
                </div>
              ) : loading ? (
                <Loader size="lg" text="Gathering insights..." />
              ) : memberData.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-900 font-bold">No Activity Recorded</p>
                    <p className="text-slate-400 text-sm font-medium italic">No work logs found for {selectedEmail || 'this member'} in {new Date(internalMonth + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</p>
                  </div>
                </div>
              ) : filteredMemberData.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Search className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-900 font-bold">No Matching Logs</p>
                    <p className="text-slate-400 text-sm font-medium italic">No entries match your search query "{searchQuery}".</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* Expand/Collapse All Actions */}
                  <div className="flex justify-end gap-3 px-8 py-3 bg-slate-50/40 border-b border-slate-100">
                    <button
                      onClick={() => {
                        const allExpanded: Record<string, boolean> = {};
                        groupedData.forEach(g => { allExpanded[g.clientName] = true; });
                        setExpandedClients(allExpanded);
                      }}
                      className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      Expand All
                    </button>
                    <span className="text-slate-300 text-xs">|</span>
                    <button
                      onClick={() => setExpandedClients({})}
                      className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>

                  {groupedData.map((group) => {
                    const isExpanded = !!expandedClients[group.clientName] || searchQuery.trim().length > 0;
                    const firstChar = group.clientName[0] || 'C';
                    
                    return (
                      <div key={group.clientName} className="transition-all duration-200">
                        {/* Parent Group Header Row */}
                        <div
                          onClick={() => toggleClientExpand(group.clientName)}
                          className="flex items-center justify-between px-8 py-4 hover:bg-slate-50/80 cursor-pointer select-none transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs shadow-sm">
                              {firstChar}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                                {group.clientName}
                              </span>
                              <span className="ml-2.5 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-bold">
                                {group.items.length} {group.items.length === 1 ? 'log' : 'logs'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-sm font-black text-slate-900 bg-slate-100/50 px-3 py-1 rounded-xl font-mono">
                                {group.totalHours.toFixed(1)}h
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            )}
                          </div>
                        </div>

                        {/* Child Group Details (Expandable) */}
                        {isExpanded && (
                          <div className="bg-slate-50/60 border-t border-b border-slate-100/50 px-8 py-2 animate-in slide-in-from-top-1 duration-200">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-slate-100/70">
                                  <th className="py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-12">Source/Notes</th>
                                  <th className="py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-24">Hours</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100/40">
                                {group.items.map((item, subIdx) => (
                                  <tr key={subIdx} className="hover:bg-slate-100/30 transition-colors">
                                    <td className="py-3 pl-12">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                          {item.source || 'Manual'}
                                          {item.start_date && ` • ${formatPeriod(item.start_date, item.end_date)}`}
                                        </span>
                                        <p className="text-xs text-slate-600 italic font-medium leading-relaxed max-w-xl">
                                          {item.notes || 'No description provided'}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="py-3 text-right text-sm font-black text-slate-700 font-mono w-24 pr-2">
                                      {Number(item.hours).toFixed(1)}h
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zero Hour Members Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
            <div className="px-8 py-6 bg-red-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Zero Hour Members</h3>
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-lg text-white text-[10px] font-bold">
                {zeroHourMembers.length}
              </span>
            </div>

            {zeroHourLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader size="md" text="Loading members..." />
              </div>
            ) : zeroHourError ? (
              <div className="p-6">
                <ErrorDisplay message={zeroHourError} onRetry={fetchZeroHourMembers} />
              </div>
            ) : (
              <>
                {/* SEND REMINDER TO ALL BUTTONS */}
                {zeroHourMembers.length > 0 && (
                  <div className="px-6 pt-6 pb-4 border-b border-slate-50 space-y-3">
                    <button
                      onClick={handleSendBulkReminders}
                      disabled={sendingAll || sendingClosure}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                      title="Send regular weekly reminder (directly to members only, NO executive CC)"
                    >
                      {sendingAll ? (
                        <Loader size="sm" inline text="SENDING..." />
                      ) : (
                        <>
                          <Mail className="w-4 h-4 text-orange-500" />
                          WEEKLY REMIND ALL ({zeroHourMembers.length})
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSendClosureReminders}
                      disabled={sendingAll || sendingClosure}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md shadow-red-200/50 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                      title="Send strict 5th-of-the-month closure warning (includes CC to all 4 Executive Members)"
                    >
                      {sendingClosure ? (
                        <Loader size="sm" inline text="DISPATCHING..." />
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-white animate-pulse" />
                          FINAL CLOSURE REMIND ({zeroHourMembers.length})
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {zeroHourMembers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                      No members with 0 hours!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {zeroHourMembers.map(email => {
                        const isSending = sendingIndividual[email];
                        const isSent = sentStatus[email];

                        return (
                          <div 
                            key={email}
                            className="w-full p-2 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between group"
                          >
                            <button 
                              onClick={() => setSelectedEmail(email)}
                              className="flex-1 text-left flex items-center gap-3 min-w-0"
                            >
                              <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-red-400 transition-colors flex-shrink-0" />
                              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 truncate">{email}</span>
                            </button>

                            {/* INDIVIDUAL SEND REMINDER BUTTON */}
                            <button
                              onClick={() => handleSendIndividualReminder(email)}
                              disabled={isSending || isSent}
                              className={`ml-2 p-1.5 rounded-lg transition-all flex items-center justify-center flex-shrink-0 border cursor-pointer ${
                                isSent 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                  : 'bg-slate-50 hover:bg-red-50 hover:text-red-600 border-slate-100 hover:border-red-100 text-slate-400'
                              }`}
                              title="Send email reminder to this member"
                            >
                              {isSending ? (
                                <Loader size="sm" inline />
                              ) : isSent ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
