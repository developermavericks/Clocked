const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: clients, error } = await supabase.from('clients').select('*');
  if (error) {
    console.error('Error fetching clients:', error);
    return;
  }
  console.log('Clients count:', clients.length);
  console.log('Sample client fields:', Object.keys(clients[0]));
  console.log('Distinct core values on clients:', [...new Set(clients.map(c => c.core))]);
  console.log('Client core associations:');
  clients.forEach(c => {
    if (c.core) {
      console.log(`- Client: ${c.name}, Core Vertical: ${c.core}, Budget: ${c.budget}`);
    }
  });
}

run();
