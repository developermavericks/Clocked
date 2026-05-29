const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path = require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function search() {
  console.log('Searching Supabase...');

  // Search clients for "111" or "Target"
  const { data: clients, error: err1 } = await supabase
    .from('clients')
    .select('*');

  if (err1) {
    console.error('Clients search error:', err1);
  } else {
    const matches = clients.filter(c => 
      String(c.name || '').toLowerCase().includes('111') ||
      String(c.name || '').toLowerCase().includes('target')
    );
    console.log(`Found ${matches.length} matching clients:`, matches);
  }

  // Query allocations for "111" or "Target" or notes with "suggest" or "jan"
  const { data: weekly, error: err2 } = await supabase
    .from('allocations_weekly')
    .select('*')
    .limit(10000); // sample some

  if (err2) {
    console.error('Weekly allocations error:', err2);
  } else if (weekly) {
    const matches = weekly.filter(w => 
      String(w.notes || '').toLowerCase().includes('111') ||
      String(w.notes || '').toLowerCase().includes('suggest') ||
      String(w.client || '').toLowerCase().includes('111') ||
      String(w.client || '').toLowerCase().includes('target')
    );
    console.log(`Found ${matches.length} matching weekly allocations:`, matches.slice(0, 10));
  }
}

search().catch(console.error);
