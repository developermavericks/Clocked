const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkKeys() {
  const { data: clients, error } = await supabase.from('clients').select('*').limit(1);
  if (error) {
    console.error('Error fetching client:', error);
    return;
  }
  if (clients && clients.length > 0) {
    console.log('Client Record Keys (Columns):', Object.keys(clients[0]));
    console.log('Client Record Details:', clients[0]);
  } else {
    console.log('No clients found in database!');
  }
}

checkKeys().catch(console.error);
