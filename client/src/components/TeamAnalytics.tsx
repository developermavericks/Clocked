'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Briefcase, Maximize2, Minimize2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { apiFetch } from '@/lib/api';
import { Loader } from '@/components/Loader';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';

interface TeamAnalyticsProps {
  month: string;
  currentUserEmail: string;
}

export default function TeamAnalytics({ month, currentUserEmail }: TeamAnalyticsProps) {
  const [analysisView, setAnalysisView] = useState<'employee' | 'client'>('employee');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedChart, setExpandedChart] = useState<'bar' | 'line' | 'team' | 'costVsRevenue' | 'profitVsLoss' | 'profitabilityMargin' | null>(null);
  const [clickedEntity, setClickedEntity] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'logs' | 'finances'>('logs');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isSuperAdmin = useMemo(() => {
    const email = (currentUserEmail || '').toLowerCase().trim();
    return [
      'satyam.singh@themavericksindia.com'
    ].includes(email);
  }, [currentUserEmail]);

  const defaultVertical = useMemo(() => {
    const email = (currentUserEmail || '').toLowerCase().trim();
    if (email === 'chetan@themavericksindia.com') return 'Chetan';
    if (email === 'smriti@themavericksindia.com') return 'Smriti';
    if (email === 'archana@themavericksindia.com') return 'Archana';
    if (email === 'mitali.p@themavericksindia.com') return 'Mitali';
    if (isSuperAdmin) return 'Smriti';
    return null;
  }, [currentUserEmail, isSuperAdmin]);

  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      if (defaultVertical) {
        setSelectedVertical(defaultVertical);
      }
    } else {
      setSelectedVertical('My Vertical');
    }
  }, [defaultVertical, isSuperAdmin]);

  const viewerCoreTeam = useMemo(() => {
    if (selectedVertical === 'My Vertical') {
      return defaultVertical;
    }
    return selectedVertical;
  }, [selectedVertical, defaultVertical]);

  // Fetch report data
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await apiFetch(
          `${apiUrl}/api/finance/master?month=${month}&group_bd=false&group_leave=false&group_internal=false`
        );
        if (response.ok) {
          const data = await response.json();
          setReportData(data);
        }
      } catch (err) {
        console.error('Failed to fetch master report for Team Analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [month]);

  // Filter rawAllocations specifically for this Core Team
  const filteredAllocations = useMemo(() => {
    if (!reportData || !Array.isArray(reportData.rawAllocations) || !viewerCoreTeam) return [];
    if (viewerCoreTeam === 'All') return reportData.rawAllocations;
    return reportData.rawAllocations.filter((alloc: any) => {
      const clientName = alloc.clients?.name || '';
      return getClientCoreTeam(clientName) === viewerCoreTeam;
    });
  }, [reportData, viewerCoreTeam]);

  // Reset clicked entity when month changes
  useEffect(() => {
    setClickedEntity(null);
  }, [month]);

  const entityDetails = useMemo(() => {
    if (!clickedEntity || !filteredAllocations) return [];
    if (analysisView === 'employee') {
      return filteredAllocations.filter((alloc: any) => {
        const uName = alloc.users?.name || alloc.users?.email?.split('@')[0] || 'Unknown';
        return uName === clickedEntity;
      });
    } else {
      return filteredAllocations.filter((alloc: any) => {
        const cName = getNormalizedClientName(alloc.clients?.name || 'Unknown Client');
        return cName === clickedEntity;
      });
    }
  }, [clickedEntity, filteredAllocations, analysisView]);

  const totalHours = useMemo(() => {
    return entityDetails.reduce((sum: number, item: any) => sum + (Number(item.hours) || 0), 0);
  }, [entityDetails]);

  const uniqueAssociatedCount = useMemo(() => {
    const set = new Set();
    entityDetails.forEach((alloc: any) => {
      if (analysisView === 'employee') {
        set.add(getNormalizedClientName(alloc.clients?.name || 'Unknown Client'));
      } else {
        set.add(alloc.users?.name || alloc.users?.email?.split('@')[0] || 'Unknown');
      }
    });
    return set.size;
  }, [entityDetails, analysisView]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, any[]> = {};
    entityDetails.forEach((alloc: any) => {
      const name = analysisView === 'employee' 
        ? getNormalizedClientName(alloc.clients?.name || 'Unknown Client')
        : (alloc.users?.name || alloc.users?.email?.split('@')[0] || 'Unknown');
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(alloc);
    });

    // Sort items chronologically (ascending) by start_date inside each group list
    Object.values(groups).forEach(list => {
      list.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    });

    return groups;
  }, [entityDetails, analysisView]);

  const groupedKeys = useMemo(() => {
    return Object.keys(groupedLogs).sort((a, b) => a.localeCompare(b));
  }, [groupedLogs]);

  useEffect(() => {
    if (clickedEntity) {
      const initial: Record<string, boolean> = {};
      entityDetails.forEach((alloc: any) => {
        const name = analysisView === 'employee' 
          ? getNormalizedClientName(alloc.clients?.name || 'Unknown Client')
          : (alloc.users?.name || alloc.users?.email?.split('@')[0] || 'Unknown');
        initial[name] = false;
      });
      setExpandedGroups(initial);
    }
  }, [clickedEntity, entityDetails, analysisView]);

  useEffect(() => {
    setModalTab('logs');
  }, [clickedEntity]);

  const renderCustomDot = (chartEntity: string, isExpanded: boolean = false, isActive: boolean = false) => {
    const CustomDotComponent = (props: any) => {
      const { cx, cy, stroke } = props;
      if (cx === undefined || cy === undefined) return null;
      return (
        <g>
          {/* Large transparent click area */}
          <circle
            cx={cx}
            cy={cy}
            r={16}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setClickedEntity(chartEntity);
              if (isExpanded) {
                setExpandedChart(null);
              }
            }}
          />
          {/* Small visible circle */}
          <circle
            cx={cx}
            cy={cy}
            r={isActive ? (isExpanded ? 6 : 5.5) : (isExpanded ? 4 : 3)}
            fill={stroke}
            stroke="#fff"
            strokeWidth={1.5}
            style={{ pointerEvents: 'none' }}
          />
        </g>
      );
    };
    return <CustomDotComponent />;
  };

  const clientCostRows = useMemo(() => {
    if (!clickedEntity || !reportData || !Array.isArray(reportData.rows) || analysisView !== 'client') return [];
    
    const matches: any[] = [];
    reportData.rows.forEach((r: any) => {
      const allocations = r.allocations || {};
      const clientHours = Number(allocations[clickedEntity]) || 0;
      if (clientHours > 0) {
        const salary = Number(r.salary) || 0;
        const totalHours = Number(r.totalHours) || 0;
        const sharePct = totalHours > 0 ? (clientHours / totalHours) : 0;
        const costShare = salary * sharePct;
        
        matches.push({
          name: r.name,
          email: r.email,
          salary,
          clientHours,
          totalHours,
          sharePct: (sharePct * 100).toFixed(1),
          costShare: Math.round(costShare)
        });
      }
    });
    return matches.sort((a, b) => b.costShare - a.costShare);
  }, [clickedEntity, reportData, analysisView]);

  // Helper values
  const daysInMonth = useMemo(() => {
    const [year, m] = month.split('-').map(Number);
    return new Date(year, m, 0).getDate();
  }, [month]);

  const barChartData = useMemo(() => {
    const totals: Record<string, number> = {};

    filteredAllocations.forEach((alloc: any) => {
      const uName = alloc.users?.name || alloc.users?.email?.split('@')[0] || 'Unknown';
      const cName = getNormalizedClientName(alloc.clients?.name || 'Unknown Client');
      const key = analysisView === 'employee' ? uName : cName;
      
      totals[key] = (totals[key] || 0) + (Number(alloc.hours) || 0);
    });

    return Object.keys(totals)
      .map(name => ({
        name,
        Hours: Math.round(totals[name] * 10) / 10
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAllocations, analysisView]);

  const dailyLineChartData = useMemo(() => {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthInt = parseInt(monthStr);

    const entityDailyHours: Record<string, Record<number, number>> = {};
    const uniqueEntities = new Set<string>();

    filteredAllocations.forEach((alloc: any) => {
      const uName = alloc.users?.name || alloc.users?.email?.split('@')[0] || 'Unknown';
      const cName = getNormalizedClientName(alloc.clients?.name || 'Unknown Client');
      const key = analysisView === 'employee' ? uName : cName;
      const hours = Number(alloc.hours) || 0;

      if (hours <= 0) return;

      uniqueEntities.add(key);

      if (!entityDailyHours[key]) {
        entityDailyHours[key] = {};
      }

      const dailyDistribution = getDailyDistribution(alloc.start_date, alloc.end_date, hours);
      Object.entries(dailyDistribution).forEach(([dateStr, dailyHour]) => {
        const date = new Date(dateStr);
        if (date.getFullYear() === year && (date.getMonth() + 1) === monthInt) {
          const d = date.getDate();
          entityDailyHours[key][d] = (entityDailyHours[key][d] || 0) + dailyHour;
        }
      });
    });

    const sortedEntities = Array.from(uniqueEntities).sort((a, b) => a.localeCompare(b));

    const chartData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const row: Record<string, any> = { day: d };
      sortedEntities.forEach(entity => {
        const rawHours = entityDailyHours[entity]?.[d] || 0;
        row[entity] = Math.round(rawHours * 10) / 10;
      });
      chartData.push(row);
    }

    return {
      chartData,
      entities: sortedEntities
    };
  }, [filteredAllocations, month, daysInMonth, analysisView]);

  // Set line checkboxes defaults
  useEffect(() => {
    if (dailyLineChartData.entities.length > 0) {
      setSelectedEntities(dailyLineChartData.entities.slice(0, 5));
    } else {
      setSelectedEntities([]);
    }
  }, [dailyLineChartData.entities]);

  // Computations for Stats Cards
  const stats = useMemo(() => {
    const uniqueClients = new Set<string>();
    const uniqueMembers = new Set<string>();
    let totalHours = 0;

    filteredAllocations.forEach((alloc: any) => {
      if (alloc.clients?.name) {
        uniqueClients.add(getNormalizedClientName(alloc.clients.name));
      }
      if (alloc.users?.email) {
        uniqueMembers.add(alloc.users.name || alloc.users.email);
      }
      totalHours += Number(alloc.hours) || 0;
    });

    return {
      totalHours: Math.round(totalHours),
      activeClients: uniqueClients.size,
      activeMembers: uniqueMembers.size
    };
  }, [filteredAllocations]);

  const CHART_COLORS = [
    '#2563eb', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#f43f5e', // rose
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#14b8a6', // teal
    '#f97316', // orange
  ];

  // Core leadership client hours pie distribution data
  const clientHoursDistribution = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredAllocations.forEach((alloc: any) => {
      const cName = getNormalizedClientName(alloc.clients?.name || 'Unknown Client');
      totals[cName] = (totals[cName] || 0) + (Number(alloc.hours) || 0);
    });

    return Object.keys(totals)
      .map((name, index) => ({
        name,
        value: Math.round(totals[name] * 10) / 10,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAllocations]);

  // Financial calculations strictly for the core's assigned clients
  const financialData = useMemo(() => {
    if (!reportData || !Array.isArray(reportData.clients) || !Array.isArray(reportData.rows) || !viewerCoreTeam) return [];

    const clientMetrics: Record<string, { name: string; budget: number; cost: number; revenue: number; profit: number }> = {};

    reportData.clients.forEach((c: any) => {
      const clientCore = getClientCoreTeam(c.name);
      if (viewerCoreTeam !== 'All' && clientCore !== viewerCoreTeam) return;

      clientMetrics[c.name] = {
        name: getNormalizedClientName(c.name),
        budget: Number(c.budget) || 0,
        cost: 0,
        revenue: Number(c.budget) || 0,
        profit: 0
      };
    });

    reportData.rows.forEach((r: any) => {
      const salary = Number(r.salary) || 0;
      const totalHours = Number(r.totalHours) || 0;
      if (salary === 0 || totalHours === 0) return;

      Object.entries(r.allocations).forEach(([clientName, hoursVal]) => {
        const hours = Number(hoursVal) || 0;
        if (hours === 0) return;

        const clientCore = getClientCoreTeam(clientName);
        if (viewerCoreTeam !== 'All' && clientCore !== viewerCoreTeam) return;

        const normName = getNormalizedClientName(clientName);
        if (!clientMetrics[normName]) {
          clientMetrics[normName] = {
            name: normName,
            budget: 0,
            cost: 0,
            revenue: 0,
            profit: 0
          };
        }

        const allocatedCost = salary * (hours / totalHours);
        clientMetrics[normName].cost += allocatedCost;
      });
    });

    return Object.values(clientMetrics).map(item => {
      const profit = item.revenue - item.cost;
      return {
        ...item,
        profit,
        costFormatted: Math.round(item.cost),
        revenueFormatted: Math.round(item.revenue),
        profitFormatted: Math.round(profit),
        profitMargin: item.revenue > 0 ? ((profit / item.revenue) * 100).toFixed(1) : '0'
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [reportData, viewerCoreTeam]);

  // Format currency helper
  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  if (!viewerCoreTeam) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-100">
        Access Denied: You do not have permissions to view Team Analytics.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      
      {/* Tab Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          label="Total Managed Hours"
          value={`${stats.totalHours} hrs`}
          icon={Clock}
          color="bg-blue-600"
          tooltip="Sum of all clocked allocation hours across your assigned client accounts."
        />
        <StatsCard
          label="Managed Client Accounts"
          value={stats.activeClients.toString()}
          icon={Briefcase}
          color="bg-emerald-600"
          tooltip="Number of unique active client projects assigned to your vertical."
        />
        <StatsCard
          label="Assigned Team Members"
          value={stats.activeMembers.toString()}
          icon={Users}
          color="bg-indigo-600"
          tooltip="Total distinct team members working on client accounts assigned to you."
        />
      </div>

      {/* Header and Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Team Analytics Workspace - {viewerCoreTeam === 'All' ? 'All Verticals' : `${viewerCoreTeam === 'Mitali' ? 'Mithali' : viewerCoreTeam}'s Vertical`}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare managed client working hour trends side-by-side.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans">Vertical:</span>
            <select
              value={selectedVertical || ''}
              onChange={(e) => {
                setSelectedVertical(e.target.value);
                setClickedEntity(null);
              }}
              className="text-xs font-black text-blue-600 bg-transparent border-none outline-none focus:ring-0 cursor-pointer uppercase tracking-wider py-0"
            >
              {isSuperAdmin ? (
                <>
                  <option value="Smriti">Smriti</option>
                  <option value="Archana">Archana</option>
                  <option value="Mitali">Mitali</option>
                  <option value="Chetan">Chetan</option>
                  <option value="All">All</option>
                </>
              ) : (
                <>
                  <option value="My Vertical">My Vertical</option>
                  <option value="All">All</option>
                </>
              )}
            </select>
          </div>
 
          {/* Switcher Toggle (Team / Client View) */}
          <div className="flex bg-slate-200/60 p-1 rounded-xl">
          <button
            onClick={() => {
              setAnalysisView('employee');
              setClickedEntity(null);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
              analysisView === 'employee'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Team View
          </button>
          <button
            onClick={() => {
              setAnalysisView('client');
              setClickedEntity(null);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
              analysisView === 'client'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Client View
          </button>
        </div>
      </div>
    </div>

      {/* Grid container for side-by-side charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
        
        {/* Chart 1: Bar Graph */}
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[24px] p-6 flex flex-col min-h-[480px] relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[24px] animate-in fade-in duration-200">
              <Loader size="md" />
            </div>
          )}
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CHART 1</span>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">
                Total Allocation Hours ({analysisView === 'employee' ? 'by Team' : 'by Client'})
              </h4>
              <p className="text-xs text-slate-500">
                Alphabetically sorted total logged hours for this month. Scroll horizontally if needed.
              </p>
            </div>
            <button
              onClick={() => setExpandedChart('bar')}
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
              title="Enlarge Chart"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {barChartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 rounded-xl">
              No data to display for this month.
            </div>
          ) : (
            <div className="flex-1 w-full overflow-x-auto custom-scrollbar pt-4">
              <div style={{ minWidth: `${Math.max(barChartData.length * 50, 400)}px` }} className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 15, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false} 
                      interval={0}
                      angle={-20}
                      dx={-5}
                      dy={5}
                      label={{ value: analysisView === 'employee' ? 'Team Members' : 'Clients', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false}
                      ticks={analysisView === 'employee' ? [0, 40, 80, 120, 160, 200] : undefined}
                      label={{ value: 'Allocation Hours (h)', angle: -90, position: 'insideLeft', offset: -5, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    {analysisView === 'employee' && (
                      <ReferenceLine 
                        y={160} 
                        stroke="#000000" 
                        strokeDasharray="3 3" 
                        strokeWidth={2} 
                        label={{ 
                          value: '160h Benchmark', 
                          position: 'top', 
                          fill: '#000000', 
                          fontSize: 11, 
                          fontWeight: 'bold' 
                        }} 
                      />
                    )}
                    <RechartsTooltip 
                      contentStyle={{ 
                        background: '#0f172a', 
                        border: 'none', 
                        borderRadius: '12px', 
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="Hours" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          onClick={() => setClickedEntity(entry.name)}
                          className="cursor-pointer hover:opacity-85 transition-all duration-150"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Line Graph */}
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[24px] p-6 flex flex-col min-h-[480px] relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[24px] animate-in fade-in duration-200">
              <Loader size="md" />
            </div>
          )}
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CHART 2</span>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">
                Daily Hours Timeline Trend
              </h4>
              <p className="text-xs text-slate-500">
                Day-by-day allocation curves. Select up to 10 entities to overlay.
              </p>
            </div>
            <button
              onClick={() => setExpandedChart('line')}
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
              title="Enlarge Chart"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {dailyLineChartData.chartData.length === 0 || dailyLineChartData.entities.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 rounded-xl">
              No daily records found to map.
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[350px]">
              
              {/* Checkbox Selector Column */}
              <div className="w-full lg:w-44 flex flex-col border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50 flex-shrink-0">
                <div className="bg-slate-100 px-3 py-2 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                  Toggle Lines
                </div>
                <div className="p-2 overflow-y-auto max-h-[160px] lg:max-h-[300px] space-y-1.5 custom-scrollbar flex-1">
                  {dailyLineChartData.entities.map((entity, index) => {
                    const isChecked = selectedEntities.includes(entity);
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    
                    return (
                      <div 
                        key={entity}
                        className="flex items-center gap-2 p-1 rounded hover:bg-slate-100/70 transition-colors select-none text-[10px] font-bold"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEntities(prev => [...prev, entity]);
                            } else {
                              setSelectedEntities(prev => prev.filter(x => x !== entity));
                            }
                          }}
                          className="peer appearance-none w-3.5 h-3.5 border border-slate-300 rounded checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
                        />
                        <div 
                          onClick={() => setClickedEntity(entity)}
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:text-blue-600 transition-colors"
                          title={`Click to analyze ${entity}`}
                        >
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-slate-600 truncate flex-1">
                            {entity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Line Graph Canvas */}
              <div className="flex-1 overflow-x-auto custom-scrollbar select-none pt-4">
                <div style={{ minWidth: '450px' }} className="h-[300px] lg:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyLineChartData.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="day" 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight="bold" 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Calendar Day of Month', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight="bold" 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Allocation Hours (h)', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          background: '#0f172a', 
                          border: 'none', 
                          borderRadius: '12px', 
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      {dailyLineChartData.entities.map((entity, index) => {
                        if (!selectedEntities.includes(entity)) return null;
                        return (
                          <Line
                            key={entity}
                            type="monotone"
                            dataKey={entity}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={2.5}
                            dot={renderCustomDot(entity, false, false)}
                            activeDot={renderCustomDot(entity, false, true)}
                            onClick={() => {
                              setClickedEntity(entity);
                            }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leadership Client Hours Distribution Donut Section */}
      <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[24px] p-6 flex flex-col relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[24px] animate-in fade-in duration-200">
            <Loader size="md" />
          </div>
        )}
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">CLIENT HOURS DISTRIBUTION</span>
            <h4 className="text-base font-bold text-slate-900 mt-0.5">
              Client Working Hours Proportional Share (Total Circle Breakdown)
            </h4>
            <p className="text-xs text-slate-500">
              Visual share of total working hours distributed across client projects in your vertical.
            </p>
          </div>
          <button
            onClick={() => setExpandedChart('team')}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
            title="Enlarge Chart"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {clientHoursDistribution.length === 0 ? (
          <div className="min-h-[220px] flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 rounded-xl">
            No client allocations logged for this month.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Pie Chart Donut */}
            <div className="lg:col-span-5 h-[260px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientHoursDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {clientHoursDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        onClick={() => {
                          setAnalysisView('client');
                          setClickedEntity(entry.name);
                        }}
                        className="cursor-pointer hover:opacity-80 transition-all duration-150 outline-none"
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center stats overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Hours</span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
                  {clientHoursDistribution.reduce((acc, c) => acc + c.value, 0).toFixed(1)}
                </span>
              </div>
            </div>

            {/* Right: Constituent list */}
            <div className="lg:col-span-7 space-y-3">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-2">
                Constituent Share Breakdown
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                {clientHoursDistribution.map((entry) => {
                  const totalHoursSum = clientHoursDistribution.reduce((sum, item) => sum + item.value, 0);
                  const pct = totalHoursSum > 0 ? ((entry.value / totalHoursSum) * 100).toFixed(1) : '0';
                  return (
                    <button 
                      key={entry.name} 
                      onClick={() => {
                        setAnalysisView('client');
                        setClickedEntity(entry.name);
                      }}
                      className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-100/80 hover:border-blue-300 hover:shadow-sm active:scale-[0.99] border border-slate-100 rounded-2xl transition-all duration-200 text-left w-full cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span 
                          className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block leading-tight truncate" title={entry.name}>
                            {entry.name}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{pct}% Share</span>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0">
                        <span className="text-xs font-black text-slate-900 block font-mono">
                          {entry.value.toFixed(1)}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400">Hours</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Overview section: Client Budget vs Cost & Profitability Analysis */}
      <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[32px] p-8 flex flex-col space-y-8 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[32px] animate-in fade-in duration-200">
            <Loader size="lg" />
          </div>
        )}
        <div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block font-sans">FINANCIAL OVERVIEW</span>
          <h4 className="text-xl font-black text-slate-900 mt-1">
            Client Budget vs Cost & Profitability Analysis
          </h4>
          <p className="text-sm text-slate-500 font-medium mt-1">
            View client cost allocation compared against budgeted revenue for your vertical in <strong>{month}</strong>.
          </p>
        </div>

        {financialData.length === 0 ? (
          <div className="min-h-[220px] flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 rounded-xl">
            No financial metrics found for your assigned clients.
          </div>
        ) : (
          <>
            {/* Stats row inside the financial overview card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between font-sans">
                  <span>Total Managed Budget (Revenue)</span>
                </span>
                <span className="text-2xl font-black text-blue-600 block mt-1 font-mono">
                  {fmtCurrency(financialData.reduce((sum, item) => sum + item.revenue, 0))}
                </span>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between font-sans">
                  <span>Total Allocation Cost</span>
                </span>
                <span className="text-2xl font-black text-rose-600 block mt-1 font-mono">
                  {fmtCurrency(financialData.reduce((sum, item) => sum + item.cost, 0))}
                </span>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between font-sans">
                  <span>Net Profit / Loss</span>
                </span>
                {(() => {
                  const netProfit = financialData.reduce((sum, item) => sum + item.profit, 0);
                  return (
                    <span className={`text-2xl font-black block mt-1 font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {fmtCurrency(netProfit)}
                    </span>
                  );
                })()}
              </div>

            </div>

            {/* Cost vs Revenue and Absolute Margin Bar Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              
              {/* Chart 1: Cost vs Revenue Grouped Bar Chart */}
              <div className="border border-slate-100 rounded-3xl p-6 bg-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-sans">Cost vs Revenue Comparison</span>
                    <h5 className="text-sm font-bold text-slate-800 mt-0.5">Budgeted Revenue & Distributed Resource Cost</h5>
                  </div>
                  <button
                    onClick={() => setExpandedChart('costVsRevenue')}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
                    title="Enlarge Chart"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                {/* HTML Legend */}
                <div className="flex items-center justify-center gap-6 pb-2 pt-1 select-none border-b border-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans">Allocated Resource Cost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans">Revenue (Budget)</span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar select-none pb-2">
                  <div style={{ minWidth: financialData.length > 0 ? `${Math.max(450, financialData.length * 60)}px` : '100%', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialData} margin={{ top: 20, right: 10, left: 25, bottom: 85 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={8} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          interval={0}
                          angle={-30}
                          dx={-8}
                          dy={8}
                          label={{ value: 'Clients', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={9} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(v) => `₹${v/1000}k`}
                          label={{ value: 'Amount (INR)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <RechartsTooltip 
                          formatter={(v) => [fmtCurrency(Number(v)), '']}
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="revenueFormatted" name="Revenue (Budget)" fill="#10b981" radius={[6, 6, 0, 0]}>
                          {financialData.map((entry, index) => (
                            <Cell 
                              key={`cell-rev-${index}`} 
                              onClick={() => {
                                setAnalysisView('client');
                                setClickedEntity(entry.name);
                              }}
                              className="cursor-pointer hover:opacity-85 transition-all duration-150"
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="costFormatted" name="Allocated Resource Cost" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                          {financialData.map((entry, index) => (
                            <Cell 
                              key={`cell-cost-${index}`} 
                              onClick={() => {
                                setAnalysisView('client');
                                setClickedEntity(entry.name);
                              }}
                              className="cursor-pointer hover:opacity-85 transition-all duration-150"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Chart 2: Net Profit Margin per Client */}
              <div className="border border-slate-100 rounded-3xl p-6 bg-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-sans">Net Profit / Loss per Client</span>
                    <h5 className="text-sm font-bold text-slate-800 mt-0.5">Absolute Net Margin Generated</h5>
                  </div>
                  <button
                    onClick={() => setExpandedChart('profitVsLoss')}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
                    title="Enlarge Chart"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-full overflow-x-auto custom-scrollbar select-none pb-2">
                  <div style={{ minWidth: financialData.length > 0 ? `${Math.max(450, financialData.length * 60)}px` : '100%', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialData} margin={{ top: 20, right: 10, left: 25, bottom: 85 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={8} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          interval={0}
                          angle={-30}
                          dx={-8}
                          dy={8}
                          label={{ value: 'Clients', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={9} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(v) => `₹${v/1000}k`}
                          label={{ value: 'Profit / Loss (INR)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <RechartsTooltip 
                          formatter={(v) => [fmtCurrency(Number(v)), 'Net Profit/Loss']}
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="profitFormatted" name="Net Profit / Loss" radius={[6, 6, 0, 0]}>
                          {financialData.map((entry, idx) => (
                            <Cell 
                              key={`cell-${idx}`} 
                              fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} 
                              onClick={() => {
                                setAnalysisView('client');
                                setClickedEntity(entry.name);
                              }}
                              className="cursor-pointer hover:opacity-85 transition-all duration-150"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>

            {/* Chart 3 & Details Table Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              
              {/* Left: Profit Margin Percentages Line Chart */}
              <div className="lg:col-span-5 border border-slate-100 rounded-3xl p-6 bg-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-sans">Profitability Margin (%)</span>
                    <h5 className="text-sm font-bold text-slate-800 mt-0.5">Net Profit Margin by Client</h5>
                  </div>
                  <button
                    onClick={() => setExpandedChart('profitabilityMargin')}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
                    title="Enlarge Chart"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-full overflow-x-auto custom-scrollbar select-none pb-2">
                  <div style={{ minWidth: financialData.length > 0 ? `${Math.max(300, financialData.filter(item => item.revenue > 0).length * 60)}px` : '100%', height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={financialData.filter(item => item.revenue > 0)} 
                        margin={{ top: 20, right: 10, left: 25, bottom: 45 }}
                        style={{ cursor: 'pointer' }}
                        onClick={(state: any) => {
                          if (state && state.activeLabel) {
                            setAnalysisView('client');
                            setClickedEntity(state.activeLabel);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={8} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          interval={0}
                          angle={-30}
                          dx={-8}
                          dy={8}
                          label={{ value: 'Clients', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={9} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(v) => `${v}%`}
                          label={{ value: 'Profit Margin (%)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <RechartsTooltip 
                          formatter={(v) => [`${v}%`, 'Margin']}
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profitMargin" 
                          stroke="#8b5cf6" 
                          strokeWidth={3} 
                          dot={{ r: 3, className: "cursor-pointer" }} 
                          activeDot={{ r: 6, className: "cursor-pointer" }} 
                          onClick={(data: any) => {
                            if (data && data.payload) {
                              setAnalysisView('client');
                              setClickedEntity(data.payload.name);
                            }
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right: Detailed Tabular breakdown */}
              <div className="lg:col-span-7 border border-slate-100 rounded-3xl p-6 bg-white space-y-4 shadow-sm">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-sans">Detailed Financial Breakdown</span>
                  <h5 className="text-sm font-bold text-slate-800 mt-0.5">Client Profitability Registry</h5>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-100 font-sans">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Revenue</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Resource Cost</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Net Profit</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {financialData.map((item) => (
                        <tr 
                          key={item.name} 
                          onClick={() => {
                            setAnalysisView('client');
                            setClickedEntity(item.name);
                          }}
                          className="hover:bg-slate-100/70 transition-colors cursor-pointer select-none"
                        >
                          <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{fmtCurrency(item.revenue)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-500">{fmtCurrency(item.cost)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {fmtCurrency(item.profit)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${item.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {item.profitMargin}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </>
        )}
      </div>

      {/* Expanded Chart Overlay Modal */}
      {expandedChart && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-[92vw] h-[86vh] flex flex-col p-6 md:p-8 relative">
            
            {/* Header of Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  {viewerCoreTeam === 'All' ? 'All Verticals' : `${viewerCoreTeam === 'Mitali' ? 'Mithali' : viewerCoreTeam}'s Vertical`}' Team Analytics
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {expandedChart === 'bar' && `Total Allocation Hours (${analysisView === 'employee' ? 'by Team' : 'by Client'})`}
                  {expandedChart === 'line' && 'Daily Hours Timeline Trend Curve'}
                  {expandedChart === 'team' && 'Client Working Hours Proportional Share'}
                  {expandedChart === 'costVsRevenue' && 'Budgeted Revenue & Distributed Resource Cost'}
                  {expandedChart === 'profitVsLoss' && 'Absolute Net Margin Generated'}
                  {expandedChart === 'profitabilityMargin' && 'Net Profit Margin by Client'}
                </h3>
              </div>

              {/* Minimize Action Button */}
              <button
                onClick={() => setExpandedChart(null)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-sm"
              >
                <Minimize2 className="w-4 h-4" />
                Close Full-Screen
              </button>
            </div>

            {/* Canvas body */}
            <div className="flex-1 w-full min-h-0 relative overflow-hidden flex flex-col">
              
              {expandedChart === 'bar' && (
                <div className="w-full flex-1 overflow-x-auto custom-scrollbar select-none pt-4">
                  <div style={{ minWidth: `${Math.max(barChartData.length * 90, 1200)}px` }} className="h-[90%]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 20, right: 10, left: 25, bottom: 95 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={10} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          interval={0}
                          angle={-25}
                          dx={-10}
                          dy={10}
                          label={{ value: analysisView === 'employee' ? 'Team Members' : 'Clients', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={10} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false} 
                          allowDecimals={false}
                          ticks={analysisView === 'employee' ? [0, 40, 80, 120, 160, 200] : undefined}
                          label={{ value: 'Allocation Hours (h)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        />
                        {analysisView === 'employee' && (
                          <ReferenceLine 
                            y={160} 
                            stroke="#000000" 
                            strokeDasharray="3 3" 
                            strokeWidth={2.5} 
                            label={{ 
                              value: '160h Benchmark', 
                              position: 'top', 
                              fill: '#000000', 
                              fontSize: 12, 
                              fontWeight: 'bold' 
                        }} 
                      />
                    )}
                    <RechartsTooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="Hours" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          onClick={() => setClickedEntity(entry.name)}
                          className="cursor-pointer hover:opacity-85 transition-all duration-150"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {expandedChart === 'line' && (
            <div className="w-full flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
              {/* Toggle list in maximize view */}
              <div className="w-full lg:w-56 flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0 max-h-[160px] lg:max-h-full">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  Toggle Lines
                </div>
                <div className="p-3 overflow-y-auto space-y-2 custom-scrollbar flex-1 bg-white dark:bg-slate-900">
                  {dailyLineChartData.entities.map((entity, index) => {
                    const isChecked = selectedEntities.includes(entity);
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    return (
                      <div key={entity} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEntities(prev => [...prev, entity]);
                            } else {
                              setSelectedEntities(prev => prev.filter(x => x !== entity));
                            }
                          }}
                          className="peer appearance-none w-4 h-4 border border-slate-300 rounded checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
                        />
                        <div 
                          onClick={() => {
                            setClickedEntity(entity);
                            setExpandedChart(null);
                          }}
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title={`Click to analyze ${entity}`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white dark:border-slate-800" style={{ backgroundColor: color }} />
                          <span className="text-slate-800 dark:text-slate-100 truncate flex-1 font-bold">{entity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Maximized Line graph canvas */}
              <div className="flex-1 overflow-x-auto custom-scrollbar select-none pt-2">
                <div style={{ minWidth: '800px' }} className="h-[90%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyLineChartData.chartData} margin={{ top: 20, right: 15, left: 15, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="day" 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight="bold" 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Calendar Day of Month', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight="bold" 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Allocation Hours (h)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      {dailyLineChartData.entities.map((entity, index) => {
                        if (!selectedEntities.includes(entity)) return null;
                        return (
                          <Line
                            key={entity}
                            type="monotone"
                            dataKey={entity}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={3}
                            dot={renderCustomDot(entity, true, false)}
                            activeDot={renderCustomDot(entity, true, true)}
                            onClick={() => {
                              setClickedEntity(entity);
                              setExpandedChart(null);
                            }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {expandedChart === 'team' && (
            <div className="w-full flex-1 flex flex-col lg:flex-row gap-6 min-h-0 pt-4">
              <div className="lg:col-span-7 h-[350px] lg:h-[450px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientHoursDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={90}
                      outerRadius={135}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {clientHoursDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          onClick={() => {
                            setAnalysisView('client');
                            setClickedEntity(entry.name);
                            setExpandedChart(null);
                          }}
                          className="cursor-pointer hover:opacity-80 transition-all duration-150 outline-none"
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Hours</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-50 mt-1 font-mono">
                    {clientHoursDistribution.reduce((acc, c) => acc + c.value, 0).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="w-full lg:w-96 flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 flex-shrink-0 max-h-[160px] lg:max-h-full">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  Constituents Breakdown
                </div>
                <div className="p-3 overflow-y-auto space-y-2 custom-scrollbar flex-1 bg-white dark:bg-slate-900">
                  {clientHoursDistribution.map((entry) => {
                    const totalHoursSum = clientHoursDistribution.reduce((sum, item) => sum + item.value, 0);
                    const pct = totalHoursSum > 0 ? ((entry.value / totalHoursSum) * 100).toFixed(1) : '0';
                    return (
                      <button 
                        key={entry.name} 
                        onClick={() => {
                          setAnalysisView('client');
                          setClickedEntity(entry.name);
                          setExpandedChart(null);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-blue-300 hover:shadow-sm active:scale-[0.99] transition-all duration-150 select-none text-xs font-bold w-full text-left cursor-pointer focus:outline-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white dark:border-slate-800" style={{ backgroundColor: entry.color }} />
                          <span className="text-slate-800 dark:text-slate-100 truncate flex-1">{entry.name}</span>
                        </div>
                        <span className="text-slate-600 dark:text-slate-300 font-mono font-bold shrink-0 pl-2">{pct}% ({entry.value.toFixed(1)} hrs)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {expandedChart === 'costVsRevenue' && (
            <div className="w-full flex-1 overflow-x-auto custom-scrollbar select-none pt-4">
              <div style={{ minWidth: `${Math.max(1000, financialData.length * 100)}px` }} className="h-[90%]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData} margin={{ top: 20, right: 10, left: 25, bottom: 95 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      dx={-10}
                      dy={10}
                      label={{ value: 'Clients', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `₹${v/1000}k`}
                      label={{ value: 'Amount (INR)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <RechartsTooltip 
                      formatter={(v) => [fmtCurrency(Number(v)), '']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="revenueFormatted" name="Revenue (Budget)" fill="#10b981" radius={[8, 8, 0, 0]}>
                      {financialData.map((entry, index) => (
                        <Cell 
                          key={`cell-expanded-rev-${index}`} 
                          onClick={() => {
                            setAnalysisView('client');
                            setClickedEntity(entry.name);
                            setExpandedChart(null);
                          }}
                          className="cursor-pointer hover:opacity-85 transition-all duration-150"
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="costFormatted" name="Allocated Resource Cost" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                      {financialData.map((entry, index) => (
                        <Cell 
                          key={`cell-expanded-cost-${index}`} 
                          onClick={() => {
                            setAnalysisView('client');
                            setClickedEntity(entry.name);
                            setExpandedChart(null);
                          }}
                          className="cursor-pointer hover:opacity-85 transition-all duration-150"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {expandedChart === 'profitVsLoss' && (
            <div className="w-full flex-1 overflow-x-auto custom-scrollbar select-none pt-4">
              <div style={{ minWidth: `${Math.max(1000, financialData.length * 100)}px` }} className="h-[90%]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData} margin={{ top: 20, right: 10, left: 25, bottom: 95 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      dx={-10}
                      dy={10}
                      label={{ value: 'Clients', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `₹${v/1000}k`}
                      label={{ value: 'Profit / Loss (INR)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <RechartsTooltip 
                      formatter={(v) => [fmtCurrency(Number(v)), 'Net Profit/Loss']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="profitFormatted" name="Net Profit / Loss" radius={[8, 8, 0, 0]}>
                      {financialData.map((entry, idx) => (
                        <Cell 
                          key={`cell-${idx}`} 
                          fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} 
                          onClick={() => {
                            setAnalysisView('client');
                            setClickedEntity(entry.name);
                            setExpandedChart(null);
                          }}
                          className="cursor-pointer hover:opacity-85 transition-all duration-150"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {expandedChart === 'profitabilityMargin' && (
            <div className="w-full flex-1 overflow-x-auto custom-scrollbar select-none pt-4">
              <div style={{ minWidth: `${Math.max(1000, financialData.filter(item => item.revenue > 0).length * 100)}px` }} className="h-[90%]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={financialData.filter(item => item.revenue > 0)} 
                    margin={{ top: 20, right: 15, left: 15, bottom: 95 }}
                    style={{ cursor: 'pointer' }}
                    onClick={(state: any) => {
                      if (state && state.activeLabel) {
                        setAnalysisView('client');
                        setClickedEntity(state.activeLabel);
                        setExpandedChart(null);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      dx={-10}
                      dy={10}
                      label={{ value: 'Clients', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `${v}%`}
                      label={{ value: 'Profit Margin (%)', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <RechartsTooltip 
                      formatter={(v) => [`${v}%`, 'Margin']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profitMargin" 
                      stroke="#8b5cf6" 
                      strokeWidth={3.5} 
                      dot={{ r: 4, className: "cursor-pointer" }} 
                      activeDot={{ r: 7, className: "cursor-pointer" }} 
                      onClick={(data: any) => {
                        if (data && data.payload) {
                          setAnalysisView('client');
                          setClickedEntity(data.payload.name);
                          setExpandedChart(null);
                        }
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

            </div>
          </div>
        </div>
      )}
      {/* Clicked Entity Details Modal */}
      {clickedEntity && (
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setClickedEntity(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col p-6 relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-sans">
                  {analysisView === 'employee' ? 'Team Member Directory' : 'Client Working Directory'}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {analysisView === 'employee' 
                    ? `Working Details for ${clickedEntity}` 
                    : `Team Working on ${clickedEntity}`
                  }
                </h3>
              </div>
              <button
                onClick={() => setClickedEntity(null)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all shadow-sm cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider block font-sans">Total Logged Hours</span>
                <span className="text-xl font-black text-blue-700 dark:text-blue-300 block mt-1 font-mono">{totalHours.toFixed(1)} hrs</span>
              </div>
              <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-wider block font-sans">
                  {analysisView === 'employee' ? 'Assigned Clients' : 'Active Team Members'}
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 block mt-1 font-mono">
                  {uniqueAssociatedCount} {analysisView === 'employee' 
                    ? (uniqueAssociatedCount === 1 ? 'client' : 'clients') 
                    : (uniqueAssociatedCount === 1 ? 'member' : 'members')
                  }
                </span>
              </div>
            </div>

            {/* Tab Switcher inside Modal (Only shown for Client View) */}
            {analysisView === 'client' && (
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-4 w-fit select-none">
                <button
                  onClick={() => setModalTab('logs')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalTab === 'logs'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Work Logs
                </button>
                <button
                  onClick={() => setModalTab('finances')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalTab === 'finances'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Salary Cost Allocation
                </button>
              </div>
            )}

            {/* Table Details */}
            <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 custom-scrollbar shadow-inner">
              {analysisView === 'client' && modalTab === 'finances' ? (
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider">Employee Name</th>
                      <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-right">Monthly Salary</th>
                      <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-right">Hours on Client</th>
                      <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-right">Total Hours</th>
                      <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-right">Allocation %</th>
                      <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-right">Allocated Resource Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {clientCostRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400 italic">No salary cost records found.</td>
                      </tr>
                    ) : (
                      clientCostRows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                            {row.name}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {fmtCurrency(row.salary)}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-900 dark:text-slate-100 font-bold">
                            {row.clientHours.toFixed(1)}h
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-500 dark:text-slate-500">
                            {row.totalHours.toFixed(1)}h
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {row.sharePct}%
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-rose-600 dark:text-rose-400 font-black">
                            {fmtCurrency(row.costShare)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">
                      Grouped Work Logs
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                      <button
                        onClick={() => {
                          const updated = { ...expandedGroups };
                          groupedKeys.forEach(k => { updated[k] = true; });
                          setExpandedGroups(updated);
                        }}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-wider focus:outline-none border-none bg-transparent cursor-pointer font-black"
                      >
                        Expand All
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        onClick={() => {
                          const updated = { ...expandedGroups };
                          groupedKeys.forEach(k => { updated[k] = false; });
                          setExpandedGroups(updated);
                        }}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-wider focus:outline-none border-none bg-transparent cursor-pointer font-black"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>

                  {/* Groups */}
                  {groupedKeys.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 italic font-sans">No details recorded.</div>
                  ) : (
                    groupedKeys.map((groupName) => {
                      const logs = groupedLogs[groupName];
                      const isExpanded = !!expandedGroups[groupName];
                      const totalGroupHours = logs.reduce((sum, log) => sum + (Number(log.hours) || 0), 0);

                      return (
                        <div key={groupName} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                          {/* Header */}
                          <button
                            onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 transition-colors border-none text-left cursor-pointer focus:outline-none"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              )}
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs">
                                {groupName}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 font-sans">
                                {logs.length} {logs.length === 1 ? 'log' : 'logs'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono shrink-0 pl-2">
                              {totalGroupHours.toFixed(1)}h
                            </span>
                          </button>

                          {/* Sub-table */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-950">
                              <table className="w-full text-left border-collapse text-xs font-sans">
                                <thead className="bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                    <th className="px-4 py-2 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Category</th>
                                    <th className="px-4 py-2 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Period</th>
                                    <th className="px-4 py-2 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] text-right">Hours</th>
                                    <th className="px-4 py-2 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {logs.map((alloc: any, idx: number) => {
                                    const cleanNote = alloc.notes
                                      ?.replace(/\[Time:[^\]]+\]/g, '')
                                      ?.replace(/\[Cal:[^\]]+\]/g, '')
                                      ?.trim() || '—';
                                    
                                    const isCalendar = alloc.source === 'calendar' || alloc.notes?.toLowerCase().includes('[cal:');

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-4 py-3 font-semibold">
                                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                            {alloc.category}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500">
                                          {alloc.start_date} – {alloc.end_date}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-right text-slate-700 dark:text-slate-300 font-mono">
                                          {Number(alloc.hours).toFixed(1)}h
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-sm">
                                          <div className="flex flex-col gap-1">
                                            {isCalendar && (
                                              <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60 rounded-full px-2 py-0.5 text-[8px] font-black w-fit uppercase tracking-wider font-sans">
                                                Google Calendar
                                              </span>
                                            )}
                                            <span className="leading-relaxed break-words text-[11px]">{cleanNote}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Global utility helper functions (cloned for complete standalone execution integrity)
const getDailyDistribution = (startDateStr: string, endDateStr: string, totalHours: number) => {
  if (startDateStr === endDateStr) {
    return { [startDateStr]: totalHours };
  }
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const dates: string[] = [];
  
  let curr = new Date(start);
  while (curr <= end) {
    const day = curr.getDay();
    if (day !== 0 && day !== 6) { // Weekdays only
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    curr.setDate(curr.getDate() + 1);
  }

  if (dates.length === 0) {
    curr = new Date(start);
    while (curr <= end) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      curr.setDate(curr.getDate() + 1);
    }
  }

  const dailyHours: Record<string, number> = {};
  if (dates.length > 0) {
    const share = totalHours / dates.length;
    dates.forEach(d => {
      dailyHours[d] = share;
    });
  }
  return dailyHours;
};

const getClientCoreTeam = (rawName: string): string => {
  const s = String(rawName || '').trim();
  const low = s.toLowerCase();

  const archanaClients = ["adda education", "capitaland", "chargezone", "college vidya", "goldi solar", "gradright", "icreate", "merrakki", "murf ai", "musashi", "musashi-d", "omnicom global", "pearl academy", "plaksha"];
  const mitaliClients = ["angara", "bambrew", "chupps", "clinikally", "eruditus", "fujifilm", "gnfz", "google", "inc.5", "innover", "jci", "joshtalks", "milliken", "modi illva", "nec", "noise", "nuuk", "people matters", "people matteras", "qubo", "truworth", "vivo", "wadhwani", "haystack"];
  const smritiClients = ["aptiv", "astra security", "avpn", "axitrust", "bcg", "bd - bright money", "decentro", "face", "hasbro", "mff", "mpokket", "msdf", "oister", "olster", "paasa", "payglocal", "pixxel", "pixel", "plum", "pyt", "razorpay", "room to read", "scale", "scapia", "sense ai", "shubhanshu", "straive", "truefan ai", "udaiti", "udhyam", "zeno"];
  const chetanClients = ["capital league", "crazzy bosses", "optiemus infracom", "optimus infrastructure", "pmi"];

  if (archanaClients.some(c => low.includes(c))) return "Archana";
  if (mitaliClients.some(c => low.includes(c))) return "Mitali";
  if (smritiClients.some(c => low.includes(c))) return "Smriti";
  if (chetanClients.some(c => low.includes(c))) return "Chetan";

  const isBd = low === 'bd' || low.startsWith('bd ') || low.startsWith('bd-') || low.startsWith('bd -') || low.startsWith('bd/') || low.startsWith('bd –') || low.startsWith('bd —') || low.startsWith('group bd');
  if (isBd) return "BD";

  return "Internal";
};

const getNormalizedClientName = (rawName: string) => {
  const s = String(rawName || '').trim();
  const low = s.toLowerCase();
  if (low === 'chargezone') return 'Chargezone (TECSO)';
  if (low === 'omnicom global') return 'Omnicom Global Solutions';
  if (low === 'pixel') return 'Pixxel';
  if (low === 'olster') return 'Oister';
  if (low === 'optimus infrastructure') return 'Optiemus Infracom';
  if (low === 'people matteras') return 'People Matters';
  if (low === 'haystack') return 'Haystack';
  if (low.startsWith('astra security')) return 'Astra Security';
  if (low.includes('lunch')) return 'Lunch Break';
  if (low.includes('free_time')) return 'FREE_TIME';
  return s;
};
