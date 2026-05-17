require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function assign() {
  try {
    // 1. Get Pooja's ID
    const { data: poojaUser, error: err1 } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'pooja@themavericksindia.com')
      .single();
    
    if (err1) throw err1;
    const poojaId = poojaUser.id;

    // 2. Get the 3 users' IDs
    const emails = [
      'arunkumar@themavericksindia.com',
      'divyanshsharma@themavericksindia.com',
      'satyam.singh@themavericksindia.com'
    ];

    const { data: teamUsers, error: err2 } = await supabase
      .from('users')
      .select('id, email')
      .in('email', emails);

    if (err2) throw err2;

    // 3. Insert into teams table
    const inserts = teamUsers.map(user => ({
      manager_id: poojaId,
      member_id: user.id
    }));

    // Delete existing mappings for these members first to prevent unique constraint errors
    await supabase.from('teams').delete().in('member_id', teamUsers.map(u => u.id));

    const { error: err3 } = await supabase
      .from('teams')
      .insert(inserts);

    if (err3) throw err3;

    console.log('Successfully assigned users to Pooja! Assigned ' + inserts.length + ' users.');
  } catch (err) {
    console.error('Error:', err);
  }
}

assign();
