const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use the Service Role Key to bypass RLS restrictions
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  console.log('Updating role to core for avinash@themavericksindia.com and avinash@themavericks.in...');
  
  const emails = ['avinash@themavericksindia.com', 'avinash@themavericks.in'];
  
  for (const email of emails) {
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'core' })
      .eq('email', email)
      .select();

    if (error) {
      console.error(`Failed for ${email}:`, error.message);
    } else {
      console.log(`Success for ${email}:`, data);
    }
  }
}

fix();
