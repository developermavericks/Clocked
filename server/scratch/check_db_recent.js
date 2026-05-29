const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Fetching recent weekly allocations...');
  const { data: weekly, error: errW } = await supabase
    .from('allocations_weekly')
    .select('*, users(email), clients(name)')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (errW) {
    console.error('Error fetching weekly:', errW);
  } else {
    console.log(`Fetched ${weekly.length} recent weekly allocations:`);
    weekly.forEach(w => {
      console.log(`- Created: ${w.created_at}, User: ${w.users?.email}, Client: ${w.clients?.name}, Start: ${w.start_date}, End: ${w.end_date}, Hours: ${w.hours}, Notes: "${w.notes}"`);
    });
  }

  console.log('\nFetching recent monthly allocations...');
  const { data: monthly, error: errM } = await supabase
    .from('allocations_monthly')
    .select('*, users(email), clients(name)')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (errM) {
    console.error('Error fetching monthly:', errM);
  } else {
    console.log(`Fetched ${monthly.length} recent monthly allocations:`);
    monthly.forEach(m => {
      console.log(`- Created: ${m.created_at}, User: ${m.users?.email}, Client: ${m.clients?.name}, Month: ${m.month}, Hours: ${m.hours}, Notes: "${m.notes}"`);
    });
  }
}

check().catch(console.error);
