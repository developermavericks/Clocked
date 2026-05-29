const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function find() {
  const { data: clients, error } = await supabase.from('clients').select('*');
  if (error) {
    console.error(error);
    return;
  }
  console.log('Total clients:', clients.length);
  const matches = clients.filter(c => c.name.includes('111') || c.name.toLowerCase().includes('target') || c.name.toLowerCase().includes('account'));
  console.log('Matches:', matches);

  // Let's also print all client names that have digits in them
  const digits = clients.filter(c => /\d/.test(c.name));
  console.log('Clients with digits in name:', digits);
}

find().catch(console.error);
