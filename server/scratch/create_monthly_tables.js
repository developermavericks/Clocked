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

const sqlQueries = `
  -- Add joining_date and exit_date to clients table
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT '2025-11-01';
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS exit_date DATE;

  -- Create monthly_salaries table
  CREATE TABLE IF NOT EXISTS public.monthly_salaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    salary NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, month)
  );

  -- Create monthly_budgets table
  CREATE TABLE IF NOT EXISTS public.monthly_budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    budget NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, month)
  );
`;

async function runMigration() {
  console.log('Attempting to execute migration SQL via Supabase REST API...');

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: sqlQueries
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('\n❌ RPC exec_sql is not enabled or failed.');
      console.log('Please copy and run the following SQL inside your Supabase Dashboard SQL Editor:');
      console.log('\n=========================================');
      console.log(sqlQueries);
      console.log('=========================================\n');
      return;
    }

    console.log('✅ Database migration executed successfully!');
  } catch (err) {
    console.error('Migration failed with error:', err);
    console.log('\nPlease run the SQL manually in Supabase Dashboard SQL Editor:\n', sqlQueries);
  }
}

runMigration().catch(console.error);
