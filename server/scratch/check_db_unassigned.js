const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Querying clients in database...');
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Total database clients: ${clients.length}`);
  const unassigned = clients.filter(c => !c.core || c.core.toLowerCase() === 'unassigned');
  console.log(`Clients with null/empty or 'Unassigned' core: ${unassigned.length}`);
  unassigned.forEach(c => {
    console.log(`- ID: ${c.id}, Name: ${c.name}, Core in DB: "${c.core}"`);
  });
}

run().catch(console.error);
