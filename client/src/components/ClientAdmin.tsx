'use client';

import { useState, useEffect } from 'react';
import { Users, Briefcase, ChevronRight, Search, Target, Calendar, Trash2, Edit3, X, ArrowRight, CheckCircle2, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import SearchableSelect from '@/components/SearchableSelect';
import { Loader } from '@/components/Loader';

export default function ClientAdmin({ 
  selectedMonth, 
  setSelectedMonth,
  isAddFormOpen: parentIsAddFormOpen,
  setIsAddFormOpen: parentSetIsAddFormOpen
}: { 
  selectedMonth: string; 
  setSelectedMonth: (m: string) => void;
  isAddFormOpen?: boolean;
  setIsAddFormOpen?: (open: boolean) => void;
}) {
  // Projected tab state removed
  const [summary, setSummary] = useState<{ name: string, hours: number }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Roster Modal State
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [rosterData, setRosterData] = useState<{ name: string, email: string, hours: number }[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [focusedClient, setFocusedClient] = useState('');

  // Projections State
  const [allClients, setAllClients] = useState<any[]>([]);
  const [projClient, setProjClient] = useState('');
  const [projMonth, setProjMonth] = useState(selectedMonth);
  const [projHours, setProjHours] = useState('');
  const [projectionsList, setProjectionsList] = useState<any[]>([]);
  const [savingProj, setSavingProj] = useState(false);
  const [projLoading, setProjLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Client Joining & Deactivation States
  const [newClientName, setNewClientName] = useState('');
  const [newClientJoinDate, setNewClientJoinDate] = useState('2025-11-01');
  const [localIsAddFormOpen, setLocalIsAddFormOpen] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);

  const isAddFormOpen = parentIsAddFormOpen !== undefined ? parentIsAddFormOpen : localIsAddFormOpen;
  const setIsAddFormOpen = parentSetIsAddFormOpen !== undefined ? parentSetIsAddFormOpen : setLocalIsAddFormOpen;

  useEffect(() => {
    fetchSummary();
    fetchClients();
  }, [selectedMonth]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/clients-summary?month=${selectedMonth}&view=weekly`);
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`);
      const data = await res.json();
      setAllClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const handleClientDateChange = async (clientId: string, field: 'joiningDate' | 'exitDate', value: string | null) => {
    setAllClients(prev => prev.map(c => c.id === clientId ? { 
      ...c, 
      [field === 'joiningDate' ? 'joining_date' : 'exit_date']: value 
    } : c));

    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/${clientId}/dates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: value
        })
      });
      if (!res.ok) {
        throw new Error('Failed to update client dates');
      }
      fetchClients();
    } catch (err: any) {
      alert(err.message);
      fetchClients();
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setIsAddingClient(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          joiningDate: newClientJoinDate
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add client');
      }

      setNewClientName('');
      setNewClientJoinDate('2025-11-01');
      setIsAddFormOpen(false);
      fetchClients();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAddingClient(false);
    }
  };

  const fetchProjections = async () => {
    setProjLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/projections`);
      const data = await response.json();
      setProjectionsList(data);
    } catch (err) {
      console.error('Failed to fetch projections:', err);
    } finally {
      setProjLoading(false);
    }
  };

  const openRoster = async (clientName: string) => {
    setFocusedClient(clientName);
    setIsRosterOpen(true);
    setRosterLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/client-roster?month=${selectedMonth}&clientName=${clientName}&view=weekly`);
      const data = await response.json();
      setRosterData(data);
    } catch (err) {
      console.error('Failed to fetch roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleAddProjection = async () => {
    if (!projClient || !projMonth || !projHours) return;
    setSavingProj(true);
    try {
      const clientObj = allClients.find(c => c.name === projClient);
      if (!clientObj) throw new Error('Client not found');

      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/projections`, {
        method: 'POST',
        body: JSON.stringify({
          id: editingId, // Pass ID if editing
          client_id: clientObj.id,
          month: projMonth,
          target_hours: parseFloat(projHours)
        })
      });
      
      setProjHours('');
      setEditingId(null);
      fetchProjections();
    } catch (err: any) {
      console.error('Projection Save Error:', err);
      alert('Error saving projection: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingProj(false);
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setProjClient(p.clients.name);
    setProjMonth(p.month);
    setProjHours(p.target_hours.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProjection = async (id: string) => {
    if (!confirm('Delete this projection?')) return;
    try {
      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/projections/${id}`, { method: 'DELETE' });
      fetchProjections();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalActualHours = summary.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        {/* Month Selector for Actuals */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">View Actual Hours</h3>
            <p className="text-xs text-slate-500 font-medium">Select a month to see performance across all clients.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SearchableSelect 
              options={[...summary].sort((a, b) => a.name.localeCompare(b.name)).map(item => ({ value: item.name, label: item.name }))}
              value=""
              onChange={(val) => {
                if (val) openRoster(val);
              }}
              placeholder="Search Client..."
              className="w-48"
            />
            <div className="flex bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
               <select 
                 value={selectedMonth.split('-')[1]} 
                 onChange={(e) => setSelectedMonth(`${selectedMonth.split('-')[0]}-${e.target.value}`)}
                 className="pl-4 pr-2 py-2.5 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
               >
                 {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                   <option key={m} value={m}>{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
                 ))}
               </select>
               <div className="w-[1px] bg-slate-200 my-2" />
               <select 
                 value={selectedMonth.split('-')[0]} 
                 onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
                 className="pl-2 pr-4 py-2.5 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-orange-600"
               >
                 {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                   <option key={y} value={y}>{y}</option>
                 ))}
               </select>
            </div>
          </div>
        </div>

        {/* Client List (Actuals) */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Hours</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-10 text-center">
                    <Loader size="md" text="Loading clients..." />
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center text-slate-400 italic">No data found for {selectedMonth}.</td>
                </tr>
              ) : (
                summary.map(item => (
                  <tr 
                    key={item.name} 
                    onClick={() => openRoster(item.name)}
                    className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                          {item.name[0]}
                        </div>
                        <span className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-sm font-mono font-black text-slate-900">{item.hours.toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-600 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && summary.length > 0 && (
               <tfoot className="bg-slate-900">
                 <tr>
                   <td className="px-8 py-5 text-sm font-bold text-white">Grand Total Hours</td>
                   <td className="px-8 py-5 text-right text-sm font-mono font-black text-orange-400">{totalActualHours.toFixed(2)}</td>
                   <td></td>
                 </tr>
               </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Client Lifecycle & Database Manager */}
      <div className="space-y-6 pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Client Database Manager</h3>
            <p className="text-sm text-slate-500 font-medium">
              Configure joining dates and exit dates for all clients. Exited clients are hidden from dropdowns and allocations after their exit date.
            </p>
          </div>
        </div>

        {/* Add Client Collapsible Form */}
        {isAddFormOpen && (
          <form onSubmit={handleAddClient} className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-4 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-orange-600" />
                Add New Client Record
              </h4>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Client Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Acme Corp"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none bg-white font-medium text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Joining Date</label>
                <input 
                  type="date"
                  required
                  value={newClientJoinDate}
                  onChange={(e) => setNewClientJoinDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none bg-white font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isAddingClient}
                className="bg-slate-900 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-md shadow-slate-100 uppercase tracking-widest cursor-pointer disabled:opacity-50"
              >
                {isAddingClient ? 'Saving...' : 'Save Client'}
              </button>
            </div>
          </form>
        )}

        {/* Client Roster List */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joining Date</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exit Date</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">No clients found.</td>
                  </tr>
                ) : (
                  allClients.map(c => {
                    const todayStr = new Date().toISOString().substring(0, 10);
                    const isExited = c.exit_date && c.exit_date.substring(0, 10) <= todayStr;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                              {c.name[0]}
                            </div>
                            <span className="text-sm font-bold text-slate-900">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm">
                          {c.exit_date ? (
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              Exited ({c.exit_date.substring(0, 10)})
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-sm">
                          <input 
                            type="date"
                            value={c.joining_date ? c.joining_date.substring(0, 10) : '2025-11-01'}
                            onChange={(e) => handleClientDateChange(c.id, 'joiningDate', e.target.value)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-600 outline-none bg-white cursor-pointer"
                          />
                        </td>
                        <td className="px-8 py-5 text-sm">
                          <input 
                            type="date"
                            value={c.exit_date ? c.exit_date.substring(0, 10) : ''}
                            onChange={(e) => handleClientDateChange(c.id, 'exitDate', e.target.value)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-600 outline-none bg-white cursor-pointer"
                          />
                        </td>
                        <td className="px-8 py-5 text-right text-sm">
                          {c.exit_date && (
                            <button 
                              onClick={() => handleClientDateChange(c.id, 'exitDate', null)}
                              className="text-xs font-black text-slate-500 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all cursor-pointer"
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Roster Modal */}
      {isRosterOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setIsRosterOpen(false)}
          />
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center font-bold text-xl">
                  {focusedClient[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{focusedClient}</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Employee Roster • {selectedMonth}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRosterOpen(false)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-0">
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rosterLoading ? (
                      <tr>
                        <td colSpan={2} className="px-10 py-10 text-center">
                          <Loader size="md" text={`Gathering data for ${focusedClient}...`} />
                        </td>
                      </tr>
                    ) : rosterData.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-10 py-20 text-center text-slate-400 italic">No employees worked on this client in {selectedMonth}.</td>
                      </tr>
                    ) : (
                      rosterData.map(emp => (
                        <tr key={emp.email} className="hover:bg-slate-50 transition-colors">
                          <td className="px-10 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{emp.name}</span>
                              <span className="text-xs text-slate-400 font-medium">{emp.email}</span>
                            </div>
                          </td>
                          <td className="px-10 py-5 text-right">
                            <span className="text-sm font-mono font-black text-orange-600">{emp.hours.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {!rosterLoading && rosterData.length > 0 && (
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td className="px-10 py-5 text-sm font-bold text-slate-900 tracking-tight uppercase">Total Client Hours</td>
                        <td className="px-10 py-5 text-right text-sm font-mono font-black text-slate-900">
                          {rosterData.reduce((acc, curr) => acc + curr.hours, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setIsRosterOpen(false)}
                className="bg-slate-900 text-white px-10 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Done Viewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
