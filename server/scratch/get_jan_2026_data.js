const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const month = '2026-01';
  console.log(`Calculating financial metrics for ${month}...`);

  // Fetch client budgets for January 2026 or default
  const { data: dbClients } = await supabase.from('clients').select('*');
  const { data: monthlyBudgets } = await supabase.from('client_monthly_overrides').select('*').eq('month', month);
  const { data: baseSalaries } = await supabase.from('employee_base_salaries').select('*');
  const { data: salaryOverrides } = await supabase.from('employee_monthly_overrides').select('*').eq('month', month);

  // Fetch all allocations for January 2026
  const { data: allocations } = await supabase
    .from('allocations_weekly')
    .select('*, clients(name)')
    .eq('month', `${month}-01`);

  console.log(`Found ${allocations.length} allocations in ${month}`);

  // Build client mapping
  const clientMap = {};
  dbClients.forEach(c => {
    const override = monthlyBudgets.find(b => b.client_id === c.id);
    const budget = override ? override.budget : c.budget;
    clientMap[c.name] = {
      name: c.name,
      budget: budget || 0,
      cost: 0,
      revenue: budget || 0,
      profit: 0
    };
  });

  // Calculate salary map
  const salaryMap = {};
  baseSalaries.forEach(s => {
    const override = salaryOverrides.find(o => o.employee_id === s.employee_id);
    salaryMap[s.employee_id] = override ? override.salary : s.salary;
  });

  // Aggregate user total hours in January 2026
  const userHours = {};
  allocations.forEach(a => {
    userHours[a.user_id] = (userHours[a.user_id] || 0) + Number(a.hours);
  });

  // Distribute cost
  allocations.forEach(a => {
    const totalH = userHours[a.user_id] || 0;
    if (totalH === 0) return;
    const salary = salaryMap[a.user_id] || 0;
    const cost = salary * (Number(a.hours) / totalH);
    const clientName = a.clients?.name || 'Unknown';
    if (!clientMap[clientName]) {
      clientMap[clientName] = {
        name: clientName,
        budget: 0,
        cost: 0,
        revenue: 0,
        profit: 0
      };
    }
    clientMap[clientName].cost += cost;
  });

  // Compute final table
  const results = Object.values(clientMap).map(item => {
    const profit = item.revenue - item.cost;
    return {
      ...item,
      profit,
      profitMargin: item.revenue > 0 ? ((profit / item.revenue) * 100).toFixed(1) : '0'
    };
  }).sort((a, b) => b.profit - a.profit);

  console.log('\nTop 15 Most Profitable Clients in Jan 2026:');
  results.slice(0, 15).forEach(r => {
    console.log(`- ${r.name}: Revenue: ₹${r.revenue.toLocaleString()}, Cost: ₹${Math.round(r.cost).toLocaleString()}, Profit: ₹${Math.round(r.profit).toLocaleString()}, Margin: ${r.profitMargin}%`);
  });

  console.log('\nTop 15 Most Unprofitable Clients in Jan 2026 (Loss Makers):');
  results.slice(-15).reverse().forEach(r => {
    console.log(`- ${r.name}: Revenue: ₹${r.revenue.toLocaleString()}, Cost: ₹${Math.round(r.cost).toLocaleString()}, Profit: ₹${Math.round(r.profit).toLocaleString()}, Margin: ${r.profitMargin}%`);
  });
}

run().catch(console.error);
