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

async function runMigration() {
  console.log('Altering clients table via Supabase REST API...');

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sql: `
        ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT '2025-11-01';
        ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS exit_date DATE;
      `
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('RPC exec_sql failed:', errorText);
    return;
  }

  console.log('✅ Columns added successfully!');
}

runMigration().catch(console.error);
