import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNikita() {
  // Find Nikita Chaurasia
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .ilike('name', '%Nikita Chaurasia%');

  if (!users || users.length === 0) {
    console.log('Nikita Chaurasia not found!');
    return;
  }

  const nikita = users[0];
  console.log(`Found User: ${nikita.name} (${nikita.email})`);

  // Find manager in teams table
  const { data: teams } = await supabase
    .from('teams')
    .select('manager_id')
    .eq('member_id', nikita.id);

  if (!teams || teams.length === 0) {
    console.log('No manager assigned to Nikita Chaurasia.');
    return;
  }

  // Find manager name
  const { data: mgr } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', teams[0].manager_id)
    .single();

  if (mgr) {
    console.log(`Nikita Chaurasia reports directly to: 👑 ${mgr.name} (${mgr.email})`);
  } else {
    console.log('Manager ID found, but manager profile is missing.');
  }
}

checkNikita();
