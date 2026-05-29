const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Fetching May 2026 allocations...');
  const { data: allocs, error: aErr } = await supabase
    .from('allocations_weekly')
    .select('*')
    .eq('month', '2026-05')
    .limit(5);

  if (aErr) {
    console.error('Error fetching allocations:', aErr);
    return;
  }

  console.log(`Found ${allocs.length} sample allocations in May 2026.`);
  for (const alloc of allocs) {
    const { data: user } = await supabase.from('users').select('*').eq('id', alloc.user_id).single();
    const { data: client } = await supabase.from('clients').select('*').eq('id', alloc.client_id).single();
    console.log(`Allocation ID: ${alloc.id}, Hours: ${alloc.hours}`);
    console.log(`- User ID: ${alloc.user_id} -> ${user ? user.email : 'NOT FOUND'}`);
    console.log(`- Client ID: ${alloc.client_id} -> ${client ? client.name : 'NOT FOUND'}`);
  }
}

run().catch(console.error);
