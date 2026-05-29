const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUserKeys() {
  const { data: users, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  if (users && users.length > 0) {
    console.log('User Record Keys (Columns):', Object.keys(users[0]));
    console.log('User Record Details:', users[0]);
  } else {
    console.log('No users found in database!');
  }
}

checkUserKeys().catch(console.error);
