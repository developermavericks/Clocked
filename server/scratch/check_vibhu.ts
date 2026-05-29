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

async function checkVibhu() {
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .ilike('name', '%vibhu%');

  console.log('Users matching name "vibhu":', users);

  const { data: users2 } = await supabase
    .from('users')
    .select('id, name, email')
    .ilike('email', '%vibhu%');

  console.log('Users matching email "vibhu":', users2);
}

checkVibhu();
