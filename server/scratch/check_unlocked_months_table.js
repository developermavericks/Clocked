const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://zietxefeihshhevouudx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log('Checking unlocked_months table...');
  try {
    const { data, error } = await supabase
      .from('unlocked_months')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching unlocked_months:', error);
    } else {
      console.log('Successfully connected! Table exists. Data:', data);
    }
  } catch (err) {
    console.error('Exception caught:', err);
  }
}

checkTable();
