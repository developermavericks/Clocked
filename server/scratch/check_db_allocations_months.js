const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Querying months in allocations_weekly...');
  
  // Find distinct months
  const { data, error } = await supabase
    .from('allocations_weekly')
    .select('month');

  if (error) {
    console.error(error);
    return;
  }

  const months = [...new Set(data.map(d => d.month))].sort();
  console.log('Distinct months in allocations_weekly:', months);
}

check().catch(console.error);
