'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Clock, Calendar as CalendarIcon, Plus, Filter, Download, Trash2 } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import AllocationsTable from '@/components/AllocationsTable';
import AddEntryModal from '@/components/AddEntryModal';
import CalendarImport from '@/components/CalendarImport';
import ExcelUpload from '@/components/ExcelUpload';
import { Loader } from '@/components/Loader';
import ClientTargetsCard from '@/components/ClientTargetsCard';
import { useAllocations } from '@/hooks/useAllocations';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export default function TeamPortal() {
  const [activeTab, setActiveTab] = useState<'projected' | 'weekly'>('weekly');
  const [displayMode, setDisplayMode] = useState<'detailed' | 'summary'>('detailed');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userRole, setUserRole] = useState('team');
  const [unlockedMonths, setUnlockedMonths] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [missedCalendarEventsCount, setMissedCalendarEventsCount] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    setSelectedIds([]);
    setMissedCalendarEventsCount(null);
  }, [month, activeTab, displayMode]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.email) {
        fetchUserRole();
        fetchUnlockedMonths();
      }
    });
  }, []);

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
            'satyam.singh@themavericksindia.com', 'smriti@themavericksindia.com'
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
    if (userRole === 'core') {
      setIsLocked(false);
      return;
    }
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      setIsLocked(false);
      return;
    }
    
    if (unlockedMonths.includes(month)) {
      setIsLocked(false);
      return;
    }

    const [targetYear, targetMonth] = month.split('-').map(Number);
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
  }, [month, userRole, unlockedMonths]);

  const { data, loading: isTableLoading, refresh } = useAllocations(user?.id, month, activeTab);

  const [projectedHours, setProjectedHours] = useState<number>(160);

  const fetchProjectedHours = async () => {
    if (!user?.id || !month) return;
    try {
      const { data: projData, error } = await supabase
        .from('allocations_monthly')
        .select('hours')
        .eq('user_id', user.id)
        .eq('month', month);

      if (error) throw error;
      
      const total = (projData || []).reduce((sum, item) => sum + Number(item.hours), 0);
      setProjectedHours(total > 0 ? total : 160);
    } catch (err) {
      console.warn('Failed to fetch projected hours:', err);
    }
  };

  useEffect(() => {
    fetchProjectedHours();
  }, [user?.id, month]);

  const handleRefreshAll = () => {
    refresh();
    fetchProjectedHours();
  };

  const handleEdit = (item: any) => {
    setEditData(item);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    setIsDeleting(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/${id}?kind=${activeTab}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSelectedIds(prev => prev.filter(item => item !== id));
        handleRefreshAll();
        alert('Entry deleted successfully!');
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete the entry.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected entries?`)) return;
    setIsDeleting(true);
    setDeleteProgress({ current: 0, total: selectedIds.length });
    try {
      let successCount = 0;
      let errorMsg = '';
      let currentIndex = 0;
      
      for (const id of selectedIds) {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/${id}?kind=${activeTab}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          successCount++;
        } else {
          const result = await response.json();
          errorMsg = result.error || 'Failed to delete some entries';
        }
        currentIndex++;
        setDeleteProgress({ current: currentIndex, total: selectedIds.length });
      }
      
      setSelectedIds([]);
      handleRefreshAll();
      
      if (successCount === selectedIds.length) {
        alert(`Successfully deleted all ${successCount} selected entries!`);
      } else if (successCount > 0) {
        alert(`Deleted ${successCount} of ${selectedIds.length} entries. Error for others: ${errorMsg}`);
      } else {
        alert(`Failed to delete entries: ${errorMsg}`);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
      setDeleteProgress(null);
    }
  };

  const handleDownload = async () => {
    if (!user) return;
    try {
      const response = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/allocations/my/export?userId=${user.id}&month=${month}&kind=${activeTab}`
      );
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Allocations_${month}_${activeTab}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loggedUpTo = (() => {
    if (!data || data.length === 0) return null;
    const dates = data
      .filter(item => item.start_date)
      .map(item => item.start_date);
    
    if (dates.length === 0) return null;

    const maxDateStr = dates.reduce((max, curr) => curr > max ? curr : max, dates[0]);
    
    try {
      const maxDate = new Date(maxDateStr);
      const day = maxDate.getDate();
      const monthName = maxDate.toLocaleString('en-US', { month: 'short' });
      const year = maxDate.getFullYear();
      
      const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      
      const dateText = `${getOrdinal(day)} ${monthName} ${year}`;

      if (missedCalendarEventsCount !== null && missedCalendarEventsCount > 0) {
        return `${dateText} (${missedCalendarEventsCount} missed calendar event${missedCalendarEventsCount > 1 ? 's' : ''})`;
      }
      return dateText;
    } catch (e) {
      return maxDateStr;
    }
  })();

  const actualHours = data.reduce((acc, curr) => acc + curr.hours, 0);
  const efficiencyPercentage = projectedHours > 0 ? (actualHours / projectedHours) * 100 : 0;

  const displayName = (() => {
    if (!user) return 'Maverick';
    const fullName = user.user_metadata?.full_name;
    if (fullName) return fullName;
    if (user.email) {
      const parts = user.email.split('@')[0].split(/[._-]/);
      return parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return 'Maverick';
  })();

  return (
    <div className="space-y-8 relative">

      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-100/70 dark:border-blue-900/30 rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50 px-2 py-0.5 rounded-md uppercase tracking-wider">
              Welcome Back
            </span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Hi, {displayName} 👋
            </span>
          </div>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">My Allocations</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Your logged hours fuel our shared goals. Thank you for keeping your timesheet accurate and up-to-date!
          </p>
        </div>
      </div>

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 text-amber-800 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-base">Monthly Submissions Locked</h4>
            <p className="text-sm text-amber-700 mt-1">
              Time logging for previous months gets locked automatically on the 5th date of the current month. Editing, deleting, and importing data are currently disabled.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          label="Total Hours" 
          value={actualHours.toFixed(1)} 
          subtext={
            <span className="text-slate-600 font-semibold">
              of {projectedHours.toFixed(0)}h (<strong className="font-extrabold text-blue-600 text-sm">{efficiencyPercentage.toFixed(1)}%</strong>)
            </span>
          } 
          icon={Clock} 
          color="bg-blue-600" 
          tooltip="Sum of your logged working hours for the selected month"
        />
        <StatsCard 
          label="Entries" 
          value={data.length} 
          subtext="items" 
          icon={CalendarIcon} 
          color="bg-emerald-600" 
          tooltip="Total number of logged time allocation entries"
        />
        <StatsCard 
          label="Efficiency" 
          value={`${efficiencyPercentage.toFixed(1)}%`} 
          subtext="vs projected" 
          icon={Filter} 
          color="bg-indigo-600" 
          tooltip="Ratio of actual hours spent on client tasks vs projected monthly work capacity"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-4 pl-1 relative z-[100]">
        <div>
          {loggedUpTo ? (
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-xl border border-emerald-100 dark:border-emerald-900/30 font-display uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Logged Up To: {loggedUpTo}
            </span>
          ) : (
            <span className="text-[11px] font-black text-slate-400 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl font-display uppercase tracking-wider">
              No Events Logged Yet
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
            <select 
              value={month.split('-')[1]} 
              onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
              disabled={isDeleting}
              className="pl-4 pr-2 py-2 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-slate-900 min-w-[120px] rounded-l-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                <option key={m} value={m}>{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-100 my-2" />
            <select 
              value={month.split('-')[0]} 
              onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
              disabled={isDeleting}
              className="pl-2 pr-4 py-2 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-blue-600 min-w-[90px] rounded-r-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => {
              if (isLocked) {
                alert("Monthly Submissions Locked: Submissions for previous months get locked on the 5th date of the current month. Please contact a Core admin to unlock this month.");
                return;
              }
              setIsModalOpen(true);
            }}
            disabled={isDeleting}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="w-full space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
              <div className="flex gap-6">
                <div className="pb-4 pt-2 text-sm font-bold border-b-2 border-blue-600 text-blue-600">
                  Monthly Actuals
                </div>
              </div>
              <div className="flex gap-4 items-center">
                {selectedIds.length > 0 && (
                  <button 
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 transition-all shadow-sm animate-in fade-in zoom-in duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? (
                      deleteProgress ? (
                        `Deleting... ${Math.round((deleteProgress.current / deleteProgress.total) * 100)}% (${deleteProgress.current}/${deleteProgress.total})`
                      ) : (
                        "Deleting..."
                      )
                    ) : (
                      `Delete Selected (${selectedIds.length})`
                    )}
                  </button>
                )}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setDisplayMode('detailed')}
                    disabled={isDeleting}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${displayMode === 'detailed' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50`}
                  >
                    Detailed
                  </button>
                  <button 
                    onClick={() => setDisplayMode('summary')}
                    disabled={isDeleting}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${displayMode === 'summary' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50`}
                  >
                    Summary
                  </button>
                </div>
                <button 
                  onClick={handleDownload}
                  disabled={isDeleting}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-0 relative min-h-[200px]">
              {(isTableLoading || isDeleting) && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl animate-in fade-in duration-200">
                  <Loader 
                    size="md" 
                    text={
                      isDeleting && deleteProgress
                        ? `Deleting: ${Math.round((deleteProgress.current / deleteProgress.total) * 100)}% (${deleteProgress.current}/${deleteProgress.total})`
                        : isDeleting
                        ? "Processing deletion..."
                        : "Loading allocations..."
                    } 
                  />
                </div>
              )}
              <div className="space-y-8">
                <AllocationsTable 
                  data={data} 
                  type={activeTab} 
                  displayMode={displayMode} 
                  onDelete={handleDelete}
                  onEdit={(id) => {
                    const item = data.find(d => d.id === id);
                    if (item) handleEdit(item);
                  }}
                  isLocked={isLocked}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  isDeleting={isDeleting}
                />
              </div>
            </div>
          </div>

          {activeTab === 'weekly' && user && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <CalendarImport 
                userId={user.id} 
                month={month} 
                onSuccess={handleRefreshAll} 
                onMissedCountChange={setMissedCalendarEventsCount} 
              />
              <ExcelUpload userId={user.id} month={month} type="weekly" onSuccess={handleRefreshAll} isLocked={isLocked} />
            </div>
          )}
        </div>
      </div>

      <AddEntryModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsEditMode(false);
          setEditData(null);
        }} 
        type={activeTab} 
        month={month} 
        userId={user?.id}
        onSuccess={handleRefreshAll}
        isEdit={isEditMode}
        initialData={editData}
      />
    </div>
  );
}
