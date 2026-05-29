const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // standard or let's try direct queries
  console.log('Tables check:');
  
  // Let's run a query to get tables if RPC doesn't exist
  const { data: clients } = await supabase.from('clients').select('*').limit(1);
  console.log('clients exists:', !!clients);

  const { data: allocations_weekly } = await supabase.from('allocations_weekly').select('*').limit(1);
  console.log('allocations_weekly exists:', !!allocations_weekly);

  const { data: client_monthly_overrides } = await supabase.from('client_monthly_overrides').select('*').limit(1);
  console.log('client_monthly_overrides exists:', !!client_monthly_overrides);

  const { data: employee_base_salaries } = await supabase.from('employee_base_salaries').select('*').limit(1);
  console.log('employee_base_salaries exists:', !!employee_base_salaries);

  const { data: employee_monthly_overrides } = await supabase.from('employee_monthly_overrides').select('*').limit(1);
  console.log('employee_monthly_overrides exists:', !!employee_monthly_overrides);
}

check().catch(console.error);
