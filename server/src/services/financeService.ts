import { supabase } from '../config/supabase';
import ExcelJS from 'exceljs';
import { isActiveUser, getActiveEmailsList } from '../config/activeUsers';
import { getEffectiveExitMonthsMap } from './reportService';

const CLIENT_CORES: Record<string, string> = {
  "Adda Education": "Archana",
  "CapitaLand": "Archana",
  "Chargezone (TECSO)": "Archana",
  "College Vidya": "Archana",
  "Goldi Solar": "Archana",
  "GradRight": "Archana",
  "iCreate": "Archana",
  "Merrakki": "Archana",
  "Murf AI": "Archana",
  "Musashi": "Archana",
  "Musashi-D": "Archana",
  "Omnicom Global Solutions": "Archana",
  "Pearl Academy": "Archana",
  "Plaksha": "Archana",

  "Angara": "Mitali",
  "Bambrew": "Mitali",
  "Chupps": "Mitali",
  "Clinikally": "Mitali",
  "Eruditus": "Mitali",
  "FUJIFILM": "Mitali",
  "GNFZ": "Mitali",
  "Google": "Mitali",
  "Inc.5": "Mitali",
  "Innover": "Mitali",
  "JCI": "Mitali",
  "JoshTalks": "Mitali",
  "Milliken": "Mitali",
  "Modi Illva": "Mitali",
  "NEC": "Mitali",
  "Noise": "Mitali",
  "Nuuk": "Mitali",
  "People Matters": "Mitali",
  "QUBO (HEPL)": "Mitali",
  "Truworth": "Mitali",
  "Vivo": "Mitali",
  "Wadhwani": "Mitali",

  "Aptiv": "Smriti",
  "Astra Security": "Smriti",
  "AVPN": "Smriti",
  "AxiTrust": "Smriti",
  "BCG": "Smriti",
  "BD - Bright Money": "Smriti",
  "Decentro": "Smriti",
  "FACE": "Smriti",
  "Hasbro": "Smriti",
  "MFF": "Smriti",
  "mPokket": "Smriti",
  "MSDF": "Smriti",
  "Oister": "Smriti",
  "Paasa": "Smriti",
  "PayGlocal": "Smriti",
  "Pixxel": "Smriti",
  "Plum": "Smriti",
  "PYT": "Smriti",
  "Razorpay": "Smriti",
  "Room to Read": "Smriti",
  "SCALE": "Smriti",
  "Scapia": "Smriti",
  "Sense AI": "Smriti",
  "Shubhanshu": "Smriti",
  "Straive": "Smriti",
  "TrueFan AI": "Smriti",
  "Udaiti": "Smriti",
  "Udhyam": "Smriti",
  "Zeno": "Smriti",

  "Capital League": "Chetan",
  "Crazzy Bosses": "Chetan",
  "Optiemus Infracom": "Chetan",
  "PMI": "Chetan",

  "BD": "",
  "BD - AECOM": "",
  "BD - Astrotalk": "",
  "BD - Boston Scientific": "",
  "BD - Capitalmind": "",
  "BD - Caterpillar": "",
  "BD - Chalet": "",
  "BD - Chorus": "",
  "BD - CLI": "",
  "BD - Griffith": "",
  "BD - Infinite": "",
  "BD - iTel": "",
  "BD - IVCA": "",
  "BD - JAR": "",
  "BD - Mahavir": "",
  "BD - Mitsbushi": "",
  "BD - Panasonic": "",
  "BD - Peak XV": "",
  "BD - Qualcomm": "",
  "BD - Shadowfax": "",
  "BD - Shiprocket": "",
  "BD - Simple Energy": "",
  "BD - UPgrad": "",
  "BD - WGT": "",
  "BD - YouTube": "",
  "BD - Zeti": "",
  "BD - Zeta": "",
  "BD - Eume": "",
  "FREE_TIME": "",
  "Internal - CS": "",
  "Internal Creative": "",
  "Internal Finance": "",
  "Internal HR": "",
  "Internal Marketing": "",
  "Internal Tech": "",
  "Internal Training": "",
  "LEAVE": "",
  "Personal Commitments": "",
  "BD - BD": "",
  "BD - Innovist": "",
  "Haystack": "Mitali",
  "Lunch Break": ""
};

const LOWERCASE_CLIENT_CORES: Record<string, { originalName: string; core: string }> = {};
Object.entries(CLIENT_CORES).forEach(([name, core]) => {
  LOWERCASE_CLIENT_CORES[name.toLowerCase()] = { originalName: name, core };
});

const isLeaveClient = (name: string) => {
  return ['leave', 'personal commitments'].includes(name.toLowerCase());
};

const isBdClient = (name: string) => {
  const low = name.toLowerCase();
  return (
    low === 'bd' ||
    low.startsWith('bd ') ||
    low.startsWith('bd-') ||
    low.startsWith('bd -') ||
    low.startsWith('bd/') ||
    low.startsWith('bd –') ||
    low.startsWith('bd —')
  );
};

const isInternalClient = (name: string) => {
  const low = name.toLowerCase();
  const internalGroupList = [
    'internal – cs',
    'internal - cs',
    'internal creative',
    'internal finance',
    'internal hr',
    'internal marketing',
    'internal tech',
    'internal training'
  ];
  return internalGroupList.includes(low);
};

const getNormalizedClientNameAndCore = (rawName: string): { name: string; core: string } => {
  const clean = rawName.trim();
  const low = clean.toLowerCase();

  const directMatch = LOWERCASE_CLIENT_CORES[low];
  if (directMatch) {
    return { name: directMatch.originalName, core: directMatch.core };
  }

  if (low === 'chargezone') {
    return { name: 'Chargezone (TECSO)', core: 'Archana' };
  }
  if (low === 'omnicom global') {
    return { name: 'Omnicom Global Solutions', core: 'Archana' };
  }
  if (low === 'pixel') {
    return { name: 'Pixxel', core: 'Smriti' };
  }
  if (low === 'olster') {
    return { name: 'Oister', core: 'Smriti' };
  }
  if (low === 'optimus infrastructure') {
    return { name: 'Optiemus Infracom', core: 'Chetan' };
  }
  if (low === 'people matteras') {
    return { name: 'People Matters', core: 'Mitali' };
  }
  if (low === 'haystack') {
    return { name: 'Haystack', core: 'Mitali' };
  }
  if (low.startsWith('astra security')) {
    return { name: 'Astra Security', core: 'Smriti' };
  }

  if (isBdClient(clean)) {
    return { name: 'BD', core: '' };
  }
  if (isInternalClient(clean) || low.startsWith('internal')) {
    return { name: 'Internal - CS', core: '' };
  }
  if (isLeaveClient(clean) || low.startsWith('leave')) {
    return { name: 'LEAVE', core: '' };
  }
  if (low.includes('lunch')) {
    return { name: 'Lunch Break', core: '' };
  }

  return { name: 'FREE_TIME', core: '' };
};



const normalizeClientForMaster = (client: string, groupBd: boolean) => {
  const s = String(client || '').trim();
  const low = s.toLowerCase();

  if (groupBd && (
    low === 'bd' ||
    low.startsWith('bd ') ||
    low.startsWith('bd-') ||
    low.startsWith('bd -') ||
    low.startsWith('bd/') ||
    low.startsWith('bd –') ||
    low.startsWith('bd —')
  )) return 'BD';

  return s;
};

export const getCoreMasterAllocations = async (opts: {
  month: string;
  group_bd?: boolean;
  group_leave?: boolean;
  group_internal?: boolean;
}) => {
  const month = opts.month;
  const groupBd = opts.group_bd !== false;
  const groupLeave = opts.group_leave !== false;
  const groupInternal = opts.group_internal !== false;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Month must be YYYY-MM.');
  }

  // 1. Fetch first allocation month for every user to handle Join Month Logic (paginated)
  let allWeeklyLogs: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('user_id, month')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    allWeeklyLogs = allWeeklyLogs.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  const firstMonthByUser: Record<string, string> = {};
  if (allWeeklyLogs) {
    allWeeklyLogs.forEach((row: any) => {
      const uId = row.user_id;
      const m = row.month;
      if (uId && m) {
        if (!firstMonthByUser[uId] || m < firstMonthByUser[uId]) {
          firstMonthByUser[uId] = m;
        }
      }
    });
  }

  // 2. Fetch all allocations for selected month (paginated)
  let allocations: any[] = [];
  page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('*, users(*), clients(*)')
      .eq('month', month)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    allocations = allocations.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  // 3. Fetch all registered users and all clients
  const [usersRes, clientsRes] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('clients').select('*')
  ]);

  if (usersRes.error) throw usersRes.error;
  if (clientsRes.error) throw clientsRes.error;
  
  const allUsers = usersRes.data;
  const allClients = clientsRes.data;

  // Fetch the effective exit months map
  const { byUserId } = await getEffectiveExitMonthsMap();

  // Fetch monthly salary overrides for the selected month
  let monthlySalaries: any[] = [];
  try {
    const { data, error } = await supabase
      .from('monthly_salaries')
      .select('*')
      .eq('month', month);
    if (!error && data) {
      monthlySalaries = data;
    }
  } catch (err) {
    console.warn('Could not query monthly_salaries:', err);
  }

  // Fetch monthly budget overrides for the selected month
  let monthlyBudgets: any[] = [];
  try {
    const { data, error } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('month', month);
    if (!error && data) {
      monthlyBudgets = data;
    }
  } catch (err) {
    console.warn('Could not query monthly_budgets:', err);
  }

  const byMember = new Map<string, any>();

  // Pre-populate all registered users from database to ensure 100% visibility
  allUsers.forEach((u: any) => {
    if (!u.email) return;

    // Exclude if joining month is in the future relative to the target report month
    const joinMonth = u.joining_date ? u.joining_date.substring(0, 7) : '2025-11';
    if (joinMonth > month) return;

    // Exclude if exit date is set and their last active month is prior to this month
    if (u.exit_date) {
      const effExitMonth = byUserId[u.id] || '2025-10';
      if (effExitMonth < month) return;
    }

    // Find monthly salary override if it exists, otherwise fall back to base salary
    const override = monthlySalaries.find((s: any) => s.user_id === u.id);
    const sal = override ? Number(override.salary) : (u.salary !== undefined ? Number(u.salary) : 0);

    byMember.set(u.id, {
      id: u.id,
      email: u.email,
      name: u.name || u.email.split('@')[0],
      salary: sal,
      allocations: {},
      totalHours: 0,
      isRegistered: true,
      firstAllocationMonth: firstMonthByUser[u.id] || null
    });
  });

  const clientObjs = new Map<string, any>();

  // Pre-populate only the strict client list from our reference map
  Object.entries(CLIENT_CORES).forEach(([clientName, core]) => {
    const isBd = isBdClient(clientName);
    const isInternal = isInternalClient(clientName);
    const isLeave = isLeaveClient(clientName);

    // If grouping is enabled for this category, hide the individual columns!
    if (groupBd && isBd) return;
    if (groupInternal && isInternal) return;
    if (groupLeave && isLeave) return;

    // Find budget from DB if it exists
    const dbClient = allClients.find((c: any) => c.name.toLowerCase() === clientName.toLowerCase());
    
    // Filter client based on join/exit date constraints
    if (dbClient) {
      const joinMonth = dbClient.joining_date ? dbClient.joining_date.substring(0, 7) : '2025-11';
      if (joinMonth > month) return;

      if (dbClient.exit_date) {
        const exitMonth = dbClient.exit_date.substring(0, 7);
        if (exitMonth < month) return;
      }
    }

    // Find monthly budget override if it exists, otherwise fall back to base budget
    let budget = dbClient?.budget !== undefined ? Number(dbClient.budget) : 0;
    if (dbClient) {
      const budgetOverride = monthlyBudgets.find((b: any) => b.client_id === dbClient.id);
      if (budgetOverride) {
        budget = Number(budgetOverride.budget);
      }
    }

    clientObjs.set(clientName, {
      name: clientName,
      core: core,
      budget: budget
    });
  });

  // If grouping is enabled, add special group columns at the end
  if (groupBd) {
    clientObjs.set('Group BD', { name: 'Group BD', core: '', budget: 0 });
  }
  if (groupInternal) {
    clientObjs.set('Group Internal', { name: 'Group Internal', core: '', budget: 0 });
  }
  if (groupLeave) {
    clientObjs.set('Group LEAVE', { name: 'Group LEAVE', core: '', budget: 0 });
  }

  allocations.forEach((r: any) => {
    const u = r.users;
    if (!u) return;

    // Exclude if joining month is in the future
    const joinMonth = u.joining_date ? u.joining_date.substring(0, 7) : '2025-11';
    if (joinMonth > month) return;

    // Exclude if exit date is set and their last active month is prior to this month
    if (u.exit_date) {
      const effExitMonth = byUserId[u.id] || '2025-10';
      if (effExitMonth < month) return;
    }

    const firstMonth = firstMonthByUser[u.id] || null;
    if (!firstMonth || firstMonth > month) return;

    const rawClientName = String(r.clients?.name || 'Unknown Client').trim();
    
    // Normalize client name (handles spelling variants and rolls up unrecognized clients to base categories)
    const norm = getNormalizedClientNameAndCore(rawClientName);
    const clientName = norm.name;
    const hours = Number(r.hours) || 0;

    if (!byMember.has(u.id)) {
      const sal = u.salary !== undefined ? Number(u.salary) : 0;
      byMember.set(u.id, {
        id: u.id,
        email: u.email,
        name: u.name || u.email.split('@')[0],
        salary: sal,
        allocations: {},
        totalHours: 0,
        isRegistered: true,
        firstAllocationMonth: firstMonth
      });
    }

    const m = byMember.get(u.id);

    // Determine target column name for this allocation based on grouping checkboxes
    let targetColumn = clientName;
    if (groupBd && isBdClient(clientName)) {
      targetColumn = 'Group BD';
    } else if (groupInternal && isInternalClient(clientName)) {
      targetColumn = 'Group Internal';
    } else if (groupLeave && isLeaveClient(clientName)) {
      targetColumn = 'Group LEAVE';
    }

    // Ensure the client is in clientObjs so historical allocations are kept visible
    if (!clientObjs.has(targetColumn)) {
      const dbClient = allClients.find((c: any) => c.name.toLowerCase() === clientName.toLowerCase());
      const core = norm.core || dbClient?.core || '';
      
      let budget = dbClient?.budget !== undefined ? Number(dbClient.budget) : 0;
      if (dbClient) {
        const budgetOverride = monthlyBudgets.find((b: any) => b.client_id === dbClient.id);
        if (budgetOverride) {
          budget = Number(budgetOverride.budget);
        }
      }

      clientObjs.set(targetColumn, {
        name: targetColumn,
        core: core,
        budget: budget
      });
    }

    m.allocations[targetColumn] = (m.allocations[targetColumn] || 0) + hours;
    m.totalHours += hours;
  });

  // Sort clients: cores grouped, alphabetical name. Grouped columns (Group BD, Group Internal, Group LEAVE) go to the absolute end.
  const clientsFull = Array.from(clientObjs.values()).sort((a, b) => {
    const isGroupedName = (name: string) => ['group bd', 'group internal', 'group leave'].includes(name.toLowerCase());
    const isGroupA = isGroupedName(a.name);
    const isGroupB = isGroupedName(b.name);

    if (isGroupA && !isGroupB) return 1;
    if (!isGroupA && isGroupB) return -1;
    if (isGroupA && isGroupB) {
      return a.name.localeCompare(b.name);
    }

    const cA = (a.core || '').toLowerCase();
    const cB = (b.core || '').toLowerCase();

    if (cA && !cB) return -1;
    if (!cA && cB) return 1;

    const coreDiff = cA.localeCompare(cB);
    if (coreDiff !== 0) return coreDiff;

    return a.name.localeCompare(b.name);
  });

  // Sort rows alphabetically by member name
  const rows = Array.from(byMember.values()).sort((a, b) => {
    const an = (a.name || a.email).toLowerCase();
    const bn = (b.name || b.email).toLowerCase();
    return an.localeCompare(bn);
  });

  return {
    month,
    clients: clientsFull,
    rows,
    rawAllocations: allocations
  };
};

export const exportCoreMasterAllocationsToExcel = async (opts: {
  month: string;
  group_bd?: boolean;
  group_leave?: boolean;
  group_internal?: boolean;
  view_type?: 'hours' | 'percent' | 'salary';
}) => {
  const viewType = opts.view_type || 'hours';
  const data = await getCoreMasterAllocations(opts);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Master Allocations');

  // Set up Header Rows
  const header1 = ['Member', 'Email', 'Salary'];
  const header2 = ['Member', 'Email', 'Salary'];
  const budgetsRow = ['', '', 'Client Budget'];

  data.clients.forEach(c => {
    header1.push(c.core || '(Unassigned)');
    header2.push(c.name);
    budgetsRow.push(c.budget !== null && c.budget !== undefined ? c.budget : '');
  });

  worksheet.addRow(header1);
  worksheet.addRow(header2);
  worksheet.addRow(budgetsRow);

  let totalSalary = 0;
  let globalTotalHours = 0;
  const clientTotals: Record<string, { hours: number; sal: number }> = {};
  data.clients.forEach(c => clientTotals[c.name] = { hours: 0, sal: 0 });

  // Add Data Rows
  data.rows.forEach(r => {
    if (r.salary) totalSalary += Number(r.salary) || 0;
    if (r.totalHours) globalTotalHours += r.totalHours;

    const rowData = [r.name, r.email, r.salary || 0];

    data.clients.forEach(c => {
      const v = Number(r.allocations[c.name] || 0);

      clientTotals[c.name].hours += v;
      if (r.totalHours > 0 && r.salary > 0) {
        clientTotals[c.name].sal += (v / r.totalHours) * r.salary;
      }

      if (viewType === 'percent') {
        if (r.totalHours && r.totalHours > 0) {
          rowData.push(v / r.totalHours); // Fraction 0 to 1
        } else {
          rowData.push('');
        }
      } else if (viewType === 'salary') {
        if (r.totalHours && r.totalHours > 0 && r.salary > 0) {
          rowData.push((v / r.totalHours) * r.salary);
        } else {
          rowData.push('');
        }
      } else {
        rowData.push(v ? v : '');
      }
    });

    const addedRow = worksheet.addRow(rowData);

    // Highlight registered zero-allocation members in red
    if (r.totalHours === 0) {
      addedRow.getCell(1).font = { color: { argb: 'FFFF0000' }, bold: true };
    }
  });

  // Add Totals Row
  const totalRowData = ['TOTAL', '', totalSalary];
  data.clients.forEach(c => {
    const ct = clientTotals[c.name];
    if (viewType === 'percent') {
      const p = globalTotalHours > 0 ? (ct.hours / globalTotalHours) : 0;
      totalRowData.push(p);
    } else if (viewType === 'salary') {
      totalRowData.push(ct.sal);
    } else {
      totalRowData.push(ct.hours);
    }
  });
  const totalRow = worksheet.addRow(totalRowData);

  // Group / Merge Core vertical columns in Header 1
  if (header1.length > 4) {
    let startCol = 4;
    let currentColVal = header1[3];
    
    for (let c = 5; c <= header1.length + 1; c++) {
      const val = (c <= header1.length) ? header1[c-1] : '###END###'; 
      if (val !== currentColVal) {
        const numCols = (c - 1) - startCol + 1;
        if (numCols > 1) {
          worksheet.mergeCells(1, startCol, 1, c - 1);
        }
        worksheet.getCell(1, startCol).alignment = { horizontal: 'center', vertical: 'middle' };
        startCol = c;
        currentColVal = val;
      }
    }
  }

  // Row 1 & 2 styles (Headers)
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(2).font = { bold: true };
  
  // Row 3 (Budgets) style
  worksheet.getRow(3).font = { bold: true };
  for (let col = 4; col <= header1.length; col++) {
    const cell = worksheet.getCell(3, col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECFDF5' } // Soft emerald green
    };
    cell.numFmt = '"₹"#,##0.00';
  }

  // Format Salary Column & Allocations Columns
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 3) {
      // Salary Column Format
      const salCell = row.getCell(3);
      if (salCell.value) {
        salCell.numFmt = '"₹"#,##0.00';
      }

      // Allocations Columns
      for (let col = 4; col <= header1.length; col++) {
        const cell = row.getCell(col);
        if (cell.value !== '' && cell.value !== null) {
          if (viewType === 'percent') {
            cell.numFmt = '0.00%';
          } else if (viewType === 'salary') {
            cell.numFmt = '"₹"#,##0.00';
          } else {
            cell.numFmt = '0.00';
          }
        }
      }
    }
  });

  // Style Total row
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' }
    };
  });

  // Freeze Headers & Columns
  worksheet.views = [
    { state: 'frozen', xSplit: 3, ySplit: 3 }
  ];

  // Auto-resize columns
  worksheet.columns.forEach((column, i) => {
    let maxLength = 10;
    column.eachCell && column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      // Don't size based on merged header row 1 to avoid massive columns
      if (rowNumber === 1) return;
      const columnLength = cell.value ? String(cell.value).length : 0;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 3, 30);
  });

  return workbook;
};

// Admin updates for Salary
export const updateUserSalary = async (userId: string, salary: number, month?: string) => {
  if (month) {
    try {
      const { data: existing, error: qErr } = await supabase
        .from('monthly_salaries')
        .select('id')
        .eq('user_id', userId)
        .eq('month', month)
        .maybeSingle();

      if (qErr) throw qErr;

      if (existing) {
        const { data, error } = await supabase
          .from('monthly_salaries')
          .update({ salary })
          .eq('id', existing.id)
          .select();
        if (error) throw error;
        return data[0];
      } else {
        const { data, error } = await supabase
          .from('monthly_salaries')
          .insert([{ user_id: userId, month, salary }])
          .select();
        if (error) throw error;
        return data[0];
      }
    } catch (err) {
      console.warn('Upserting into monthly_salaries failed, falling back to base user salary update:', err);
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update({ salary })
    .eq('id', userId)
    .select();
  if (error) throw error;
  return data[0];
};

// Admin updates for Client Budget & Core
export const updateClientBudgetAndCore = async (clientId: string, budget: number, core: string, month?: string) => {
  if (month) {
    try {
      const { data: existing, error: qErr } = await supabase
        .from('monthly_budgets')
        .select('id')
        .eq('client_id', clientId)
        .eq('month', month)
        .maybeSingle();

      if (qErr) throw qErr;

      if (existing) {
        const { data, error } = await supabase
          .from('monthly_budgets')
          .update({ budget })
          .eq('id', existing.id)
          .select();
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('monthly_budgets')
          .insert([{ client_id: clientId, month, budget }])
          .select();
        if (error) throw error;
      }
    } catch (err) {
      console.warn('Upserting into monthly_budgets failed:', err);
    }
  }

  const { data, error } = await supabase
    .from('clients')
    .update({ budget, core })
    .eq('id', clientId)
    .select();
  if (error) throw error;
  return data[0];
};
