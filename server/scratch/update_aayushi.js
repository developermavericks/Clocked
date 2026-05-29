const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Searching for Aayushi Akhouri in database...');
  
  // Try exact match first, then search by partial name
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .or('name.ilike.%aayushi%,email.ilike.%aayushi%');

  if (error) {
    console.error('Error querying users:', error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No user found matching "Aayushi". Creating a new user record...');
    
    // Create new employee record
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        name: 'Aayushi Akhouri',
        email: 'aayushi.akhouri@themavericksindia.com',
        role: 'team',
        joining_date: '2026-05-18'
      }])
      .select();

    if (createError) {
      console.error('Error creating user:', createError);
      process.exit(1);
    }
    
    console.log('Successfully created Aayushi Akhouri:', newUser[0]);
  } else {
    console.log(`Found ${users.length} matching user(s):`);
    for (const u of users) {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Joining Date: ${u.joining_date}`);
      
      console.log(`Updating joining date to "2026-05-18" for user ${u.name}...`);
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ joining_date: '2026-05-18' })
        .eq('id', u.id)
        .select();

      if (updateError) {
        console.error('Error updating user:', updateError);
      } else {
        console.log(`Successfully updated ${u.name}:`, updated[0]);
      }
    }
  }
}

run();
