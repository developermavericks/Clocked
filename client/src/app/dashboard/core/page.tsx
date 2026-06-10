'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { Settings, FileText, Briefcase, Download, Plus, Search, ShieldCheck, User as UserIcon, Users, Trash2, UserPlus, Calendar, RefreshCw, Lock, Unlock, BarChart3, CheckCircle2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { apiFetch } from '@/lib/api';
import { Loader } from '@/components/Loader';
import ClientAdmin from '@/components/ClientAdmin';
import MemberInsights from '@/components/MemberInsights';
import TeamAnalytics from '@/components/TeamAnalytics';

export default function CorePortal() {
  const [activeTab, setActiveTab] = useState<'admin' | 'members' | 'master' | 'clients' | 'exit-date' | 'team-analytics'>('admin');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setCurrentUserEmail(user.email);
        }
      } catch (err) {
        console.error('Failed to get user session:', err);
      }
    };
    fetchUserSession();
  }, []);

  const isAuthorizedForTeamAnalytics = useMemo(() => {
    const email = currentUserEmail.toLowerCase().trim();
    return [
      'chetan@themavericksindia.com',
      'smriti@themavericksindia.com',
      'archana@themavericksindia.com',
      'mitali.p@themavericksindia.com',
      'satyam.singh@themavericksindia.com'
    ].includes(email);
  }, [currentUserEmail]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [groupBD, setGroupBD] = useState(false);
  const [groupInternal, setGroupInternal] = useState(false);
  const [exitSearch, setExitSearch] = useState('');

  // Unlocked months state
  const [unlockedMonthsList, setUnlockedMonthsList] = useState<any[]>([]);
  
  // Heatmap weekly hours state
  const [weeklyHoursData, setWeeklyHoursData] = useState<Record<string, Record<string, number>>>({});
  
  // Real-time Presence state
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { activity: string; name: string }>>({});
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePresenceChange = () => {
      setOnlineUsers((window as any).onlineUsers || {});
      setOnlineEmails((window as any).onlineEmails || new Set());
    };

    window.addEventListener('online-presence-change', handlePresenceChange);
    // Initial load
    handlePresenceChange();

    return () => {
      window.removeEventListener('online-presence-change', handlePresenceChange);
    };
  }, []);
  
  // Save feedback state
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | null>>({});
  const [newUnlockMonth, setNewUnlockMonth] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Collapsed sections state
  const [isUsersCollapsed, setIsUsersCollapsed] = useState(false);
  const [isLockRegistryCollapsed, setIsLockRegistryCollapsed] = useState(true);

  // Form states for adding a new employee
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeJoinDate, setNewEmployeeJoinDate] = useState('2025-11-01');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isClientAddFormOpen, setIsClientAddFormOpen] = useState(false);

  const [dbHealth, setDbHealth] = useState({
    status: 'Optimal',
    percentage: 12.4,
    sizeMB: 62.0,
    color: 'bg-emerald-600',
    tooltip: 'Real-time connectivity status with Supabase Database and API endpoints'
  });

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // Query counts in parallel
        const [usersRes, clientsRes, weeklyRes, monthlyRes] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('allocations_weekly').select('*', { count: 'exact', head: true }),
          supabase.from('allocations_monthly').select('*', { count: 'exact', head: true })
        ]);

        const usersCount = usersRes.count || 0;
        const clientsCount = clientsRes.count || 0;
        const weeklyCount = weeklyRes.count || 0;
        const monthlyCount = monthlyRes.count || 0;

        const totalRows = usersCount + clientsCount + weeklyCount + monthlyCount;

        // Estimate DB size: 24.5MB base overhead + row sizes
        const baseOverhead = 24.5; // MB
        const sizeMB = baseOverhead + (totalRows * 1.6) / 1024;
        const limitMB = 500.0; // Supabase Free Tier DB Limit (500MB)

        let percentage = (sizeMB / limitMB) * 100;
        if (percentage > 100) percentage = 100;

        let status = 'Optimal';
        let color = 'bg-emerald-600';
        let tooltip = `Supabase DB Storage: ${sizeMB.toFixed(1)}MB of ${limitMB}MB used (${percentage.toFixed(1)}%). Connectivity is stable.`;

        if (percentage >= 80.0) {
          status = 'Critical';
          color = 'bg-rose-600';
          tooltip = `CRITICAL: Supabase DB limit reached ${percentage.toFixed(1)}% (${sizeMB.toFixed(1)}MB / ${limitMB}MB). Upgrade required!`;
        } else if (percentage >= 50.0) {
          status = 'Warning';
          color = 'bg-amber-500';
          tooltip = `WARNING: Supabase DB limit reached ${percentage.toFixed(1)}% (${sizeMB.toFixed(1)}MB / ${limitMB}MB). Monitor storage.`;
        }

        setDbHealth({
          status,
          percentage,
          sizeMB,
          color,
          tooltip
        });
      } catch (err) {
        console.warn('System health check failed:', err);
      }
    };

    checkSystemHealth();
  }, []);

  const filteredExitUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const query = exitSearch.toLowerCase().trim();
      return name.includes(query) || email.includes(query);
    });
  }, [users, exitSearch]);

  const activeUsersOnly = useMemo(() => {
    if (!users) return [];
    return users.filter(u => !u.exit_date);
  }, [users]);

  const handleExitDateChange = async (userId: string, date: string | null) => {
    // Optimistic local state update for instant, seamless UX
    setUsers(prevUsers => 
      prevUsers.map(u => u.id === userId ? { ...u, exit_date: date } : u)
    );
    setSaveStatus(prev => ({ ...prev, [userId]: 'saving' }));
    try {
      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/users/${userId}/exit-date`, {
        method: 'PATCH',
        body: JSON.stringify({ exitDate: date })
      });
      setSaveStatus(prev => ({ ...prev, [userId]: 'saved' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [userId]: null }));
      }, 3000);
      // Silent background fetch, absolutely NO loading spinner to avoid date unmount
      await fetchUsers(false);
    } catch (err) {
      console.error('Failed to update exit date:', err);
      setSaveStatus(prev => ({ ...prev, [userId]: null }));
      // Rollback on error
      fetchUsers(true);
    }
  };

  const handleJoiningDateChange = async (userId: string, date: string | null) => {
    // Optimistic local state update for instant, seamless UX
    setUsers(prevUsers => 
      prevUsers.map(u => u.id === userId ? { ...u, joining_date: date } : u)
    );
    setSaveStatus(prev => ({ ...prev, [userId]: 'saving' }));
    try {
      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/users/${userId}/joining-date`, {
        method: 'PATCH',
        body: JSON.stringify({ joiningDate: date })
      });
      setSaveStatus(prev => ({ ...prev, [userId]: 'saved' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [userId]: null }));
      }, 3000);
      await fetchUsers(false);
    } catch (err) {
      console.error('Failed to update joining date:', err);
      setSaveStatus(prev => ({ ...prev, [userId]: null }));
      fetchUsers(true);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!newEmployeeEmail.trim()) {
      setFormError('Email is required.');
      return;
    }
    
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/users`, {
        method: 'POST',
        body: JSON.stringify({
          name: newEmployeeName.trim(),
          email: newEmployeeEmail.trim().toLowerCase(),
          joiningDate: newEmployeeJoinDate
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Failed to add employee.');
        return;
      }
      
      setFormSuccess('Employee added successfully!');
      setNewEmployeeName('');
      setNewEmployeeEmail('');
      setNewEmployeeJoinDate('2025-11-01');
      setShowAddForm(false);
      fetchUsers(false);
    } catch (err) {
      console.error('Error adding employee:', err);
      setFormError('Failed to connect to server.');
    }
  };

  // Computed values for master report grouping
  const processedReport = useMemo(() => {
    if (!report) return null;

    let columns = [...report.clients];
    let rows = JSON.parse(JSON.stringify(report.rows));

    const bdKeywords = ['bd', 'business development'];
    const internalKeywords = ['internal'];

    if (groupBD) {
      const bdColumns = columns.filter(c => bdKeywords.some(kw => c.toLowerCase().includes(kw)));
      if (bdColumns.length > 0) {
        columns = columns.filter(c => !bdColumns.includes(c));
        columns.push('Total BD');

        rows.forEach((row: any) => {
          let bdTotal = 0;
          bdColumns.forEach(c => {
            bdTotal += (row.allocations[c] || 0);
            delete row.allocations[c];
          });
          if (bdTotal > 0) row.allocations['Total BD'] = bdTotal;
        });
      }
    }

    if (groupInternal) {
      const intColumns = columns.filter(c => internalKeywords.some(kw => c.toLowerCase().includes(kw)));
      if (intColumns.length > 0) {
        columns = columns.filter(c => !intColumns.includes(c));
        columns.push('Total Internal');

        rows.forEach((row: any) => {
          let intTotal = 0;
          intColumns.forEach(c => {
            intTotal += (row.allocations[c] || 0);
            delete row.allocations[c];
          });
          if (intTotal > 0) row.allocations['Total Internal'] = intTotal;
        });
      }
    }

    return { columns, rows };
  }, [report, groupBD, groupInternal]);

  const fetchWeeklyHours = async () => {
    if (month < '2026-06') {
      setWeeklyHoursData({});
      return;
    }
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/weekly-hours?month=${month}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();

      const grouped: Record<string, Record<string, number>> = {};
      (data || []).forEach((row: any) => {
        const uId = row.user_id;
        const week = row.week_code ? row.week_code.split('-').pop() : '';
        if (!uId || !week) return;

        if (!grouped[uId]) {
          grouped[uId] = {};
        }
        grouped[uId][week] = (grouped[uId][week] || 0) + Number(row.hours);
      });

      setWeeklyHoursData(grouped);
    } catch (err) {
      console.error('Failed to fetch weekly hours for heatmap:', err);
    }
  };

  useEffect(() => {
    const loadCoreData = async () => {
      if (activeTab === 'admin') {
        setLoading(true);
        try {
          const [usersRes, unlockedRes] = await Promise.all([
            apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/all`),
            apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months`)
          ]);
          
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(usersData);
          }
          if (unlockedRes.ok) {
            const unlockedData = await unlockedRes.json();
            setUnlockedMonthsList(unlockedData || []);
          }

          if (month >= '2026-06') {
            await fetchWeeklyHours();
          }
        } catch (err) {
          console.error('Failed to load core admin data in parallel:', err);
        } finally {
          setLoading(false);
        }
      } else {
        if (activeTab === 'clients') fetchClients();
        if (activeTab === 'members' || activeTab === 'exit-date') fetchUsers(true);
        if (activeTab === 'master') fetchReport();
      }
    };

    loadCoreData();
  }, [activeTab, month]);

  const fetchUnlockedMonthsList = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months`);
      if (response.ok) {
        const data = await response.json();
        setUnlockedMonthsList(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch unlocked months:', err);
    }
  };

  const handleUnlockMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnlockMonth) return;
    setIsUnlocking(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ month: newUnlockMonth })
      });
      if (response.ok) {
        setNewUnlockMonth('');
        fetchUnlockedMonthsList();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to unlock month');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLockMonth = async (monthStr: string) => {
    if (!confirm(`Are you sure you want to lock ${monthStr} again?`)) return;
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months/${monthStr}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchUnlockedMonthsList();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to lock month');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const lockRegistryMonths = useMemo(() => {
    const start = new Date(2025, 10, 1); // Nov 2025
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const list: { monthStr: string; label: string }[] = [];
    let current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const monthNum = String(current.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${monthNum}`;
      const label = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ monthStr, label });
      current.setMonth(current.getMonth() + 1);
    }
    return list.reverse(); // Show newest months first
  }, []);

  const isDefaultOpen = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    const diffMonths = (currentYear * 12 + currentMonth) - (y * 12 + m);
    if (diffMonths <= 0) return true; // current or future month
    if (diffMonths === 1 && currentDay < 5) return true; // previous month before 5th
    return false;
  };

  const handleUnlockMonthDirect = async (monthStr: string) => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ month: monthStr })
      });
      if (response.ok) {
        fetchUnlockedMonthsList();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to unlock month');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`);
      const data = await response.json();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (showSpinner = false) => {
    if (showSpinner || users.length === 0) {
      setLoading(true);
    }
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/all`);
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/master?month=${month}`);
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/reports/export?month=${month}&token=${session?.access_token}`;
    window.open(url);
  };

  return (
    <div className="space-y-8 relative">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Core Portal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Administrative tools and master reporting for core staff.</p>
        </div>
        <div className="flex items-center gap-4 relative z-[100]">
          <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
            <select 
              value={month.split('-')[1]} 
              onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
              className="px-4 py-2 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-slate-900 min-w-[120px] rounded-l-xl"
            >
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                <option key={m} value={m}>{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-100 my-2" />
            <select 
              value={month.split('-')[0]} 
              onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
              className="px-4 py-2 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-orange-600 min-w-[90px] rounded-r-xl"
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl hidden md:flex items-center gap-2 text-sm font-bold border border-orange-200">
            <ShieldCheck className="w-4 h-4" />
            Admin Access
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-2 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center overflow-x-auto">
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'admin' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              Admin Config
            </button>
            <button 
              onClick={() => setActiveTab('members')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'members' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Members
            </button>
            <button 
              onClick={() => setActiveTab('clients')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'clients' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Clients (Admin)
            </button>
            <button 
              onClick={() => setActiveTab('master')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'master' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Master Report
            </button>
            <button 
              onClick={() => setActiveTab('exit-date')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'exit-date' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Exit & Joining (Team)
            </button>
            {isAuthorizedForTeamAnalytics && (
              <button 
                onClick={() => setActiveTab('team-analytics')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'team-analytics' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Team Analytics
              </button>
            )}
          </div>
          {activeTab === 'clients' && (
            <button
              onClick={() => setIsClientAddFormOpen(!isClientAddFormOpen)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-orange-100 uppercase tracking-widest cursor-pointer whitespace-nowrap mr-2"
            >
              <Plus className="w-4 h-4" />
              Add Client
            </button>
          )}
        </div>

        <div className="p-8">
          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatsCard label="Active Users" value={activeUsersOnly.length.toString()} icon={Settings} color="bg-orange-600" tooltip="Total number of active team members in the database" />
                <StatsCard 
                  label="System Health" 
                  value={dbHealth.status} 
                  icon={ShieldCheck} 
                  color={dbHealth.color} 
                  tooltip={dbHealth.tooltip}
                  subtext={
                    <span className="text-slate-600 font-semibold">
                      Storage: <strong className="font-extrabold text-blue-600 text-sm">{dbHealth.percentage.toFixed(1)}%</strong> used
                    </span>
                  }
                  extraContent={
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden min-w-[120px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          dbHealth.percentage >= 80 ? 'bg-rose-500' : dbHealth.percentage >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${dbHealth.percentage}%` }}
                      />
                    </div>
                  }
                />
              </div>
              
              <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
                {/* Active Users Section */}
                <div className="flex-1 min-w-0 space-y-4 w-full">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-lg font-bold text-slate-900">Manage User Roles</h3>
                    <button 
                      onClick={() => setIsUsersCollapsed(!isUsersCollapsed)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer animate-fade-in"
                    >
                      {isUsersCollapsed ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Show List</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Hide List</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {!isUsersCollapsed ? (
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-sm transition-all duration-200">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">User</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Office</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Designation</th>
                            {month >= '2026-06' && (
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Timesheet</th>
                            )}
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loading ? (
                            <tr>
                              <td colSpan={month >= '2026-06' ? 6 : 5} className="text-center py-10 bg-white">
                                <Loader size="md" text="Loading roles..." />
                              </td>
                            </tr>
                          ) : activeUsersOnly.map(u => {
                            // Role priority: Core > Manager > Team
                            let displayRole = u.role?.toUpperCase() || 'TEAM';
                            if (u.role === 'core') displayRole = 'CORE';
                            else if (u.is_manager) displayRole = 'MANAGER';
                            else displayRole = 'TEAM';

                            const handleRoleChange = async (userId: string, currentRole: string) => {
                              const roles: ('team' | 'manager' | 'core')[] = ['team', 'manager', 'core'];
                              const nextRole = roles[(roles.indexOf(currentRole as any) + 1) % roles.length];
                              
                              // Optimistic role cycle update
                              setUsers(prevUsers => 
                                prevUsers.map(u => {
                                    if (u.id === userId) {
                                      const isManager = nextRole === 'manager';
                                      return { ...u, role: nextRole, is_manager: isManager };
                                    }
                                    return u;
                                  })
                              );
                              
                              try {
                                  await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/users/${userId}/role`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ role: nextRole })
                                  });
                                  fetchUsers(false);
                              } catch (err) {
                                  console.error('Failed to update role:', err);
                                  fetchUsers(true);
                              }
                            };

                            const roleColor = 
                              displayRole === 'CORE' ? 'bg-orange-100 text-orange-700' :
                              displayRole === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-slate-100 text-slate-600';

                            // Avatar Color Logic: Only bright colors for logged-in users
                            const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600', 'bg-violet-600', 'bg-cyan-600'];
                            const colorIndex = (u.email?.length || 0) % colors.length;
                            const hasLoggedIn = !!u.last_login;
                            const avatarColor = hasLoggedIn ? colors[colorIndex] : 'bg-slate-200';
                            const initialColor = hasLoggedIn ? 'text-white' : 'text-slate-400';
                            const initial = (u.name?.[0] || u.email?.[0] || '?').toUpperCase();

                            return (
                              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                  <div className="relative group/avatar">
                                    {u.picture ? (
                                      <img src={u.picture} className="w-9 h-9 rounded-xl object-cover shadow-sm ring-2 ring-white" />
                                    ) : (
                                      <div className={`w-9 h-9 ${avatarColor} rounded-xl flex items-center justify-center ${initialColor} text-sm font-black shadow-sm ring-2 ring-white`}>
                                        {initial}
                                      </div>
                                    )}
                                    {/* Online status indicator */}
                                    {onlineEmails.has(u.email?.toLowerCase().trim()) && (
                                      <>
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                        </div>
                                        {/* Tooltip for online status */}
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/avatar:flex items-center gap-1.5 bg-slate-950 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 transition-all border border-slate-800">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                          <span>Active now — {onlineUsers[u.email?.toLowerCase().trim()]?.activity || 'online'}</span>
                                          {/* Little left-pointing arrow */}
                                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-950"></div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold text-slate-900 block leading-tight">
                                      {u.name || u.email.split('@')[0]}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{u.email.split('@')[1]}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{u.email}</td>
                                <td className="px-6 py-4 text-sm text-slate-900 font-semibold">{u.office || '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{u.title || '-'}</td>
                                {month >= '2026-06' && (
                                  <td className="px-6 py-4">
                                    <div className="flex gap-1.5 items-center">
                                      {['Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5'].map((wk) => {
                                        const hours = weeklyHoursData[u.id]?.[wk] || 0;
                                        
                                        // Determine if the week has started based on selectedMonth ("YYYY-MM")
                                        const [yStr, mStr] = month.split('-');
                                        const yearNum = parseInt(yStr);
                                        const monthIdx = parseInt(mStr) - 1;

                                        let startDay = 1;
                                        if (wk === 'Wk2') startDay = 8;
                                        else if (wk === 'Wk3') startDay = 15;
                                        else if (wk === 'Wk4') startDay = 22;
                                        else if (wk === 'Wk5') startDay = 29;

                                        const weekStartDate = new Date(yearNum, monthIdx, startDay);
                                        const now = new Date();
                                        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                                        const hasStarted = todayStart >= weekStartDate;

                                        // Determine box color and status label based on rules:
                                        // Dark Green -> High number of entries (>= 35 hrs)
                                        // Light Green -> Some entries (> 0 hrs)
                                        // Red -> No entries submitted for that week, even though the week has already passed
                                        // Grey -> The week has not started yet
                                        let boxClass = '';
                                        let statusLabel = '';
                                        let statusColorClass = '';

                                        if (!hasStarted) {
                                          boxClass = 'bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/50';
                                          statusLabel = 'Not Started';
                                          statusColorClass = 'text-slate-400';
                                        } else if (hours >= 35) {
                                          boxClass = 'bg-emerald-700 border border-emerald-800 shadow-sm';
                                          statusLabel = 'High Entries';
                                          statusColorClass = 'text-emerald-400';
                                        } else if (hours > 0) {
                                          boxClass = 'bg-emerald-400 border border-emerald-500 shadow-sm';
                                          statusLabel = 'Some Entries';
                                          statusColorClass = 'text-emerald-300';
                                        } else {
                                          boxClass = 'bg-rose-500 border border-rose-600 shadow-sm';
                                          statusLabel = 'No Entries (Missing)';
                                          statusColorClass = 'text-rose-400';
                                        }

                                        return (
                                          <div 
                                            key={wk} 
                                            className="relative group"
                                          >
                                            <div className={`w-4 h-4 rounded-md ${boxClass} transition-all duration-200 hover:scale-125 hover:z-10 cursor-pointer`} />
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap scale-95 group-hover:scale-100 border border-slate-800">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-slate-400 text-[9px] uppercase tracking-wider">{wk} Status</span>
                                                <span className="font-extrabold text-[11px] font-mono">{hours.toFixed(1)} hrs</span>
                                                <span className={`text-[9px] font-semibold ${statusColorClass}`}>
                                                  {statusLabel}
                                                </span>
                                              </div>
                                              {/* Tiny arrow */}
                                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                )}
                                <td className="px-6 py-4 text-sm text-right">
                                  <button 
                                    onClick={() => handleRoleChange(u.id, u.role || 'team')}
                                    title="Click to cycle role (Team -> Manager -> Core)"
                                    className={`${roleColor} text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest hover:brightness-95 transition-all`}
                                  >
                                    {displayRole}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setIsUsersCollapsed(false)}
                      className="border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-100/70 p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group py-12"
                    >
                      <Users className="w-8 h-8 text-slate-400 group-hover:scale-110 group-hover:text-blue-500 transition-all mb-2" />
                      <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 transition-all">
                        User Roles list is hidden
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 font-medium">Click anywhere inside this card to show the list</span>
                    </div>
                  )}
                </div>

                {/* Locked Months Manager Section */}
                <div className={`shrink-0 transition-all duration-300 w-full ${isLockRegistryCollapsed ? 'lg:w-14' : 'lg:w-[380px]'} space-y-4`}>
                  {!isLockRegistryCollapsed && (
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-lg font-bold text-slate-900">Month Lock Registry</h3>
                      <button 
                        onClick={() => setIsLockRegistryCollapsed(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer animate-fade-in"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </button>
                    </div>
                  )}
                  
                  {isLockRegistryCollapsed ? (
                    <div 
                      onClick={() => setIsLockRegistryCollapsed(false)}
                      title="Expand Month Lock Registry"
                      className="w-full lg:w-14 bg-slate-50 border border-slate-200/60 rounded-2xl p-3 flex lg:flex-col items-center justify-between cursor-pointer hover:bg-slate-100 hover:border-slate-300/80 transition-all duration-200 group lg:py-8 lg:min-h-[450px] shadow-sm select-none lg:mt-[44px]"
                    >
                      <div className="flex lg:flex-col items-center gap-3 w-full">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest lg:[writing-mode:vertical-lr] lg:rotate-180 whitespace-nowrap">
                          Lock Registry
                        </span>
                      </div>
                      <div className="flex items-center justify-center mt-auto">
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-all hidden lg:block" />
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:translate-y-[2px] transition-all block lg:hidden" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-4 shadow-sm flex flex-col transition-all duration-200 w-full">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-orange-600" />
                          Logging Lock Control
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                          Control logging availability. Locked months block any entries or modifications.
                        </p>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                        {lockRegistryMonths.map(({ monthStr, label }) => {
                          const isOpenDefault = isDefaultOpen(monthStr);
                          const isOverride = unlockedMonthsList.some(item => item.month === monthStr);
                          const isUnlocked = isOpenDefault || isOverride;

                          return (
                            <div key={monthStr} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:border-slate-200 transition-colors">
                              <div className="min-w-0 pr-2">
                                <span className="text-xs font-bold text-slate-800 block truncate">
                                  {label}
                                </span>
                                <div className="flex gap-1.5 mt-1">
                                  {isOpenDefault ? (
                                    <span className="bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                      Open (Default)
                                    </span>
                                  ) : isOverride ? (
                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                      Unlocked (Override)
                                    </span>
                                  ) : (
                                    <span className="bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                      Locked
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isOpenDefault ? (
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2.5 py-1.5">
                                    Default Open
                                  </span>
                                ) : isOverride ? (
                                  <button
                                    onClick={() => handleLockMonth(monthStr)}
                                    className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all border border-rose-200 cursor-pointer"
                                  >
                                    Lock
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUnlockMonthDirect(monthStr)}
                                    className="text-[10px] font-black text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all border border-emerald-200 cursor-pointer"
                                  >
                                    Unlock
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <MemberInsights month={month} onMonthChange={setMonth} />
          )}

          {activeTab === 'master' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Monthly Master Allocation Pivot</h3>
                  <p className="text-sm text-slate-500 font-medium">Viewing data for {new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 relative z-[100]">
                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={groupBD} 
                          onChange={(e) => setGroupBD(e.target.checked)}
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-orange-600 focus:ring-offset-1 checked:bg-orange-600 checked:border-orange-600 transition-all cursor-pointer"
                        />
                        <svg className="absolute w-4 h-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-orange-600 transition-colors">Group BD</span>
                    </label>
                    <div className="w-[1px] h-4 bg-slate-300" />
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={groupInternal} 
                          onChange={(e) => setGroupInternal(e.target.checked)}
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-orange-600 focus:ring-offset-1 checked:bg-orange-600 checked:border-orange-600 transition-all cursor-pointer"
                        />
                        <svg className="absolute w-4 h-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-orange-600 transition-colors">Group Internal</span>
                    </label>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-visible">
                    <select 
                      value={month.split('-')[1]} 
                      onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
                      className="px-3 py-1.5 text-xs font-black bg-transparent border-none focus:ring-0 outline-none cursor-pointer uppercase tracking-wider text-slate-900 min-w-[80px] rounded-l-lg"
                    >
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                        <option key={m} value={m}>{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'short' })}</option>
                      ))}
                    </select>
                    <div className="w-[1px] bg-slate-300 my-1.5" />
                    <select 
                      value={month.split('-')[0]} 
                      onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
                      className="px-3 py-1.5 text-xs font-black bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-orange-600 min-w-[80px] rounded-r-lg"
                    >
                      {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleExport}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200 uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Member</th>
                      {processedReport?.columns.map((c: string) => (
                        <th key={c} className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right ${c.startsWith('Total ') ? 'text-orange-600 bg-orange-50/50' : ''}`}>{c}</th>
                      ))}
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right font-black bg-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr>
                         <td colSpan={10} className="text-center py-10">
                           <Loader size="lg" text="Generating master report..." />
                         </td>
                       </tr>
                    ) : processedReport?.rows.map((row: any) => {
                      const total = Object.values(row.allocations).reduce((acc: number, curr: any) => acc + (curr as number), 0);
                      const isZeroHours = total === 0;
                      return (
                        <tr 
                          key={row.email} 
                          className={`transition-colors group/row ${
                            isZeroHours 
                              ? 'bg-red-50/30 hover:bg-red-100/40 dark:bg-red-950/5 dark:hover:bg-red-950/15' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className={`px-6 py-4 text-sm font-bold sticky left-0 z-10 transition-colors ${
                            isZeroHours 
                              ? 'bg-red-50/60 group-hover/row:bg-red-100/60 dark:bg-red-950/10 dark:group-hover/row:bg-red-950/20 text-red-700 dark:text-red-400' 
                              : 'bg-white text-slate-900 group-hover/row:bg-slate-50'
                          }`}>
                            <span>{row.name}</span>
                          </td>
                          {processedReport.columns.map((c: string) => (
                            <td key={c} className={`px-6 py-4 text-sm text-slate-600 font-mono text-right ${c.startsWith('Total ') ? 'font-black bg-orange-50/30 text-orange-900' : ''}`}>
                              {(row.allocations[c] || 0).toFixed(2)}
                            </td>
                          ))}
                          <td className={`px-6 py-4 text-sm font-black font-mono text-right transition-colors ${
                            isZeroHours 
                              ? 'text-red-700 bg-red-50/30 dark:text-red-400 dark:bg-red-950/5' 
                              : 'text-slate-900 bg-slate-50'
                          }`}>
                            {total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {!loading && processedReport && processedReport.rows.length > 0 && (
                    <tfoot className="bg-slate-900 shadow-xl border-t-2 border-slate-900">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-white sticky left-0 bg-slate-900 z-10 uppercase tracking-widest">Grand Total</td>
                        {processedReport.columns.map((c: string) => {
                          const colTotal = processedReport.rows.reduce((acc: number, row: any) => acc + (row.allocations[c] || 0), 0);
                          return (
                            <td key={c} className={`px-6 py-4 text-sm font-black font-mono text-right ${c.startsWith('Total ') ? 'text-orange-400 bg-slate-800' : 'text-slate-300'}`}>
                              {colTotal.toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-sm font-black font-mono text-right text-orange-400 bg-slate-800 border-l border-slate-700">
                          {processedReport.rows.reduce((acc: number, row: any) => acc + Object.values(row.allocations).reduce((sum: number, val: any) => sum + (val as number), 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <ClientAdmin selectedMonth={month} setSelectedMonth={setMonth} isAddFormOpen={isClientAddFormOpen} setIsAddFormOpen={setIsClientAddFormOpen} />
          )}

          {activeTab === 'exit-date' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Manage Team Exit & Joining</h3>
                  <p className="text-sm text-slate-500 font-medium">Set exit dates or record new team members who have joined. Exited team members are excluded from subsequent monthly reports.</p>
                </div>
                {/* Search Bar & Add Button */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-3 w-full md:max-w-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex-1">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search team members..."
                      value={exitSearch}
                      onChange={(e) => setExitSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs w-full focus:ring-0 text-slate-900"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setShowAddForm(!showAddForm);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-orange-100 uppercase tracking-wider cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Team Member
                  </button>
                </div>
              </div>

              {/* Add New Team Member Form */}
              {showAddForm && (
                <form onSubmit={handleAddEmployee} className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-4 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-orange-600" />
                      Add New Team Member record
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {formError && (
                    <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-lg border border-red-100">
                      {formError}
                    </div>
                  )}
                  {formSuccess && (
                    <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-lg border border-emerald-100">
                      {formSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Full Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Udbhav Singh"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none bg-white font-medium text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Email Address</label>
                      <input 
                        type="email"
                        placeholder="email@themavericksindia.com"
                        value={newEmployeeEmail}
                        onChange={(e) => setNewEmployeeEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none bg-white font-medium text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Joining Date</label>
                      <input 
                        type="date"
                        required
                        value={newEmployeeJoinDate}
                        onChange={(e) => setNewEmployeeJoinDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none bg-white font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-md shadow-slate-100 uppercase tracking-widest cursor-pointer"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Team Member</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Joining Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Exit Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr>
                         <td colSpan={6} className="text-center py-10">
                           <Loader size="md" text="Loading team members..." />
                         </td>
                       </tr>
                    ) : filteredExitUsers.length === 0 ? (
                       <tr><td colSpan={6} className="text-center py-10 text-slate-400 font-medium">No team members found.</td></tr>
                    ) : filteredExitUsers.map(u => {
                      const initial = (u.name?.[0] || u.email?.[0] || '?').toUpperCase();
                      const hasLoggedIn = !!u.last_login;
                      const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600', 'bg-violet-600', 'bg-cyan-600'];
                      const colorIndex = (u.email?.length || 0) % colors.length;
                      const avatarColor = hasLoggedIn ? colors[colorIndex] : 'bg-slate-200';
                      const initialColor = hasLoggedIn ? 'text-white' : 'text-slate-400';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            {u.picture ? (
                              <img src={u.picture} className="w-9 h-9 rounded-xl object-cover shadow-sm ring-2 ring-white" />
                            ) : (
                              <div className={`w-9 h-9 ${avatarColor} rounded-xl flex items-center justify-center ${initialColor} text-sm font-black shadow-sm ring-2 ring-white`}>
                                {initial}
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-bold text-slate-900 block leading-tight">{u.name || u.email.split('@')[0]}</span>
                              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{u.email.split('@')[1]}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">{u.email}</td>
                          <td className="px-6 py-4 text-sm">
                            {u.exit_date ? (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">Exited</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">Active</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <input 
                              type="date"
                              value={u.joining_date ? u.joining_date.substring(0, 10) : '2025-11-01'}
                              onChange={(e) => handleJoiningDateChange(u.id, e.target.value)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-600 outline-none bg-white cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <input 
                              type="date"
                              value={u.exit_date ? u.exit_date.substring(0, 10) : ''}
                              onChange={(e) => handleExitDateChange(u.id, e.target.value)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-600 outline-none bg-white cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-right min-w-[120px]">
                            {saveStatus[u.id] === 'saving' && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 animate-pulse uppercase tracking-wider">
                                Saving...
                              </span>
                            )}
                            {saveStatus[u.id] === 'saved' && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider animate-in fade-in duration-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saved
                              </span>
                            )}
                            {!saveStatus[u.id] && u.exit_date && (
                              <button 
                                onClick={() => handleExitDateChange(u.id, null)}
                                className="text-xs font-black text-slate-500 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Reactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'team-analytics' && (
            <TeamAnalytics month={month} currentUserEmail={currentUserEmail} />
          )}
        </div>
      </div>
    </div>
  );
}
