import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  // 1. Fetch one user and check properties
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (uErr) {
    console.error('Error fetching users:', uErr.message);
    console.error('Full Error Object:', JSON.stringify(uErr, null, 2));
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No users found in database.');
  } else {
    console.log('User keys in database:', Object.keys(users[0]));
    console.log('Sample user object:', users[0]);
  }
}

runDiagnostics();
