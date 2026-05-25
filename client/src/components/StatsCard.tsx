import React from 'react';
import { HelpCircle } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string | React.ReactNode;
  icon: any;
  color: string;
  tooltip?: string;
  extraContent?: React.ReactNode;
}

export default function StatsCard({ label, value, subtext, icon: Icon, color, tooltip, extraContent }: StatsCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative group/card">
      <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          {tooltip && (
            <div className="relative group cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 transition-colors" />
              {/* Premium styled hover tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900/95 backdrop-blur-sm text-[10px] leading-relaxed font-bold text-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50 text-center uppercase tracking-widest border border-white/10">
                {tooltip}
                {/* Tooltip triangle */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
        </div>
        {extraContent && <div className="mt-1">{extraContent}</div>}
      </div>
    </div>
  );
}
