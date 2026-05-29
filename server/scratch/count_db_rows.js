const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { count, error } = await supabase
    .from('allocations_weekly')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error counting weekly:', error);
  } else {
    console.log(`Total weekly allocations in Supabase: ${count}`);
  }
}

check().catch(console.error);
