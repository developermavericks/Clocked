'use client';

import { useState, useEffect } from 'react';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ClientTargetsCard({ month, actuals }: { month: string, actuals: any[] }) {
  const [projections, setProjections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjections();
  }, [month]);

  const fetchProjections = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/projections?month=${month}`);
      const data = await response.json();
      setProjections(data);
    } catch (err) {
      console.error('Failed to fetch projections:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group actuals by client name
  const actualHoursMap: Record<string, number> = {};
  actuals.forEach(a => {
    const clientName = a.clients?.name || 'Unknown';
    actualHoursMap[clientName] = (actualHoursMap[clientName] || 0) + (Number(a.hours) || 0);
  });

  if (loading) return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
    </div>
  );

  if (projections.length === 0) return null;

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Monthly Targets</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Admin Estimated Goals</p>
          </div>
        </div>
      </div>
      
      <div className="p-8 space-y-6">
        {projections.map(p => {
          const clientName = p.clients?.name || 'Unknown';
          const target = Number(p.target_hours) || 0;
          const actual = actualHoursMap[clientName] || 0;
          const percentage = Math.min(100, (actual / target) * 100) || 0;
          const isComplete = actual >= target;

          return (
            <div key={p.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-900">{clientName}</span>
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-400">{actual.toFixed(1)}h / </span>
                  <span className="text-sm font-mono font-black text-slate-900">{target.toFixed(1)}h</span>
                </div>
              </div>
              
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full transition-all duration-1000 ease-out rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-orange-500'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={isComplete ? 'text-emerald-600' : 'text-slate-400'}>
                  {isComplete ? 'Target Achieved' : `${(target - actual).toFixed(1)}h remaining`}
                </span>
                <span className="text-slate-900">{percentage.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
