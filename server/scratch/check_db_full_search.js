const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Thoroughly searching database tables...');

  // 1. Check clients
  const { data: clients } = await supabase.from('clients').select('*');
  clients.forEach(c => {
    Object.entries(c).forEach(([k, v]) => {
      if (String(v) === '111' || String(v).includes('111')) {
        console.log(`clients table match: ID: ${c.id}, Column: ${k}, Value: "${v}"`);
      }
    });
  });

  // 2. Check users
  const { data: users } = await supabase.from('users').select('*');
  users.forEach(u => {
    Object.entries(u).forEach(([k, v]) => {
      if (String(v) === '111' || String(v).includes('111')) {
        console.log(`users table match: ID: ${u.id}, Column: ${k}, Value: "${v}"`);
      }
    });
  });

  // 3. Check client_monthly_overrides
  const { data: overrides } = await supabase.from('client_monthly_overrides').select('*');
  overrides.forEach(o => {
    Object.entries(o).forEach(([k, v]) => {
      if (String(v) === '111' || String(v).includes('111')) {
        console.log(`client_monthly_overrides table match: ID: ${o.id}, Column: ${k}, Value: "${v}"`);
      }
    });
  });
}

check().catch(console.error);
