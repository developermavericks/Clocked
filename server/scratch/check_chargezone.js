require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, core');
  if (error) {
    console.error(error);
    return;
  }
  const match = clients.filter(c => c.name.toLowerCase().includes('chargezone') || c.name.toLowerCase().includes('tecso'));
  console.log("Matches for chargezone/tecso:", match);
  
  const allClientsWithCore = clients.map(c => `${c.name}: ${c.core || 'unassigned'}`);
  console.log("All clients in DB:\n", allClientsWithCore.join('\n'));
}
run();
