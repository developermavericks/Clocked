const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function find() {
  const { data: clients } = await supabase.from('clients').select('*').order('name');
  console.log('Client Names:');
  clients.forEach(c => {
    console.log(`- ${c.name} (Budget: ${c.budget}, Core: ${c.core}, Active: ${c.is_active})`);
  });
}

find().catch(console.error);
