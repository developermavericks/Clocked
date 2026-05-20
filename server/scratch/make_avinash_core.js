const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // load from parent server/ directory

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function makeAvinashCore() {
  const email = 'avinash@themavericksindia.com';
  console.log(`Setting role of ${email} to 'core'...`);

  const { data, error } = await supabase
    .from('users')
    .update({ role: 'core' })
    .eq('email', email)
    .select();

  if (error) {
    console.error('❌ Failed to update role in DB:', error.message);
  } else if (data && data.length > 0) {
    console.log('✅ Successfully updated Avinash role to core in DB!', data);
  } else {
    console.log('⚠️ Avinash user row not found. Inserting placeholder core user...');
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([{
        email,
        name: 'Avinash',
        role: 'core',
        salary: 0
      }])
      .select();

    if (insertError) {
      console.error('❌ Failed to insert Avinash in DB:', insertError.message);
    } else {
      console.log('✅ Successfully created Avinash as core user in DB!', insertData);
    }
  }
}

makeAvinashCore();
