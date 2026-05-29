import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('Fetching all allocations for January...');
  
  // Fetch monthly (projected) allocations
  let monthlyData: any[] = [];
  let mPage = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('allocations_monthly')
      .select('hours, user_id, month, category')
      .like('month', '%-01')
      .range(mPage * pageSize, (mPage + 1) * pageSize - 1);
    if (error) {
      console.error('Error fetching monthly data:', error);
      return;
    }
    if (!data || data.length === 0) break;
    monthlyData = monthlyData.concat(data);
    if (data.length < pageSize) break;
    mPage++;
  }

  // Fetch weekly (actuals) allocations with full pagination
  let weeklyData: any[] = [];
  let wPage = 0;
  while (true) {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('hours, user_id, month, category, notes, start_date')
      .like('month', '%-01')
      .range(wPage * pageSize, (wPage + 1) * pageSize - 1);
    if (error) {
      console.error('Error fetching weekly data:', error);
      return;
    }
    if (!data || data.length === 0) break;
    weeklyData = weeklyData.concat(data);
    if (data.length < pageSize) break;
    wPage++;
  }

  // Map months
  const monthsFound = new Set<string>();
  monthlyData?.forEach(d => monthsFound.add(d.month));
  weeklyData?.forEach(d => monthsFound.add(d.month));

  console.log('\n--- Months found with January codes:', Array.from(monthsFound));

  for (const m of Array.from(monthsFound)) {
    const monthlyAllocs = monthlyData?.filter(d => d.month === m) || [];
    const weeklyAllocs = weeklyData?.filter(d => d.month === m) || [];

    const totalMonthlyHours = monthlyAllocs.reduce((sum, d) => sum + Number(d.hours), 0);
    const totalWeeklyHours = weeklyAllocs.reduce((sum, d) => sum + Number(d.hours), 0);

    console.log(`\n=================== MONTH: ${m} ===================`);
    console.log(`Monthly (Projected) allocations sum: ${totalMonthlyHours.toFixed(2)}h (${monthlyAllocs.length} entries)`);
    console.log(`Weekly (Actuals) allocations sum:   ${totalWeeklyHours.toFixed(2)}h (${weeklyAllocs.length} entries)`);
    console.log(`Combined absolute entries sum:      ${(totalMonthlyHours + totalWeeklyHours).toFixed(2)}h`);

    // Let's analyze top loggers in weekly actuals to check for potential duplicate calendar logs!
    const userWeeklyHours: Record<string, { name: string; hours: number; entryCount: number }> = {};
    
    // Fetch users for naming
    const { data: users } = await supabase.from('users').select('id, name, email');
    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    weeklyAllocs.forEach(alloc => {
      const uId = alloc.user_id;
      const uInfo = userMap.get(uId) || { name: 'Unknown', email: 'unknown' };
      if (!userWeeklyHours[uId]) {
        userWeeklyHours[uId] = { name: uInfo.name || uInfo.email, hours: 0, entryCount: 0 };
      }
      userWeeklyHours[uId].hours += Number(alloc.hours);
      userWeeklyHours[uId].entryCount += 1;
    });

    const sortedUsers = Object.entries(userWeeklyHours).sort((a, b) => b[1].hours - a[1].hours);

    console.log('\nTop 15 employees by logged actual hours:');
    sortedUsers.slice(0, 15).forEach(([id, info]) => {
      console.log(`- ${info.name}: ${info.hours.toFixed(1)}h (${info.entryCount} entries)`);
    });

    // Check for high hours anomalies (e.g. users with > 250 hours logged)
    const anomalies = sortedUsers.filter(([_, info]) => info.hours > 240);
    if (anomalies.length > 0) {
      console.log('\n⚠️ Potential Anomalies Detected (Employees with extreme logged hours > 240h):');
      anomalies.forEach(([id, info]) => {
        console.log(`  - ${info.name} has ${info.hours.toFixed(1)}h logged!`);
      });
    } else {
      console.log('\n✅ No users with extreme logged hours (> 240h) found.');
    }
  }
}

verify();
