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

async function run() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  const { data: clients, error: cErr } = await supabase
    .from('clients')
    .select('*')
    .limit(1);

  if (cErr) {
    console.error('Error fetching clients:', cErr.message);
    process.exit(1);
  }

  if (!clients || clients.length === 0) {
    console.log('No clients found in database.');
  } else {
    console.log('Client keys in database:', Object.keys(clients[0]));
    console.log('Sample client object:', clients[0]);
  }
}

run();
