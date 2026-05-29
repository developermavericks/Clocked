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

async function checkCores() {
  const { data: users, error } = await supabase
    .from('users')
    .select('name, email, role')
    .eq('role', 'core');

  if (error) {
    console.error('Error fetching core users:', error);
    return;
  }

  console.log('\n--- ACTIVE CORE ADMINS (GLOBAL ACCESS) ---');
  users.forEach((u, i) => {
    console.log(`${i + 1}. 👑 ${u.name} (${u.email})`);
  });
  console.log('-------------------------------------------\n');
}

checkCores();
