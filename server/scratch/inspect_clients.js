const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path = require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: clients } = await supabase.from('clients').select('*');
  console.log('Total Clients in DB:', clients.length);
  
  const targetMatches = clients.filter(c => 
    c.name.toLowerCase().includes('target') || 
    c.name.toLowerCase().includes('111') ||
    c.name.toLowerCase().includes('jan') ||
    c.name.toLowerCase().includes('suggest')
  );
  console.log('Target/111/Jan Matches:', targetMatches);

  // Let's check allocations_weekly
  const { data: allocations } = await supabase.from('allocations_weekly').select('client').limit(1000);
  const uniqueClients = [...new Set(allocations.map(a => a.client))];
  console.log('Sample Unique Clients in Allocations:', uniqueClients.slice(0, 50));
}

inspect().catch(console.error);
