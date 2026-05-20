const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  console.log('Creating unlocked_months table via Supabase REST API...');

  // We use Supabase's SQL execution via a raw fetch to the SQL endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sql: `
        CREATE TABLE IF NOT EXISTS public.unlocked_months (
          month TEXT PRIMARY KEY,
          unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE public.unlocked_months ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can view unlocked months" ON public.unlocked_months;
        CREATE POLICY "Anyone can view unlocked months" ON public.unlocked_months FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Only Core can manage unlocked months" ON public.unlocked_months;
        CREATE POLICY "Only Core can manage unlocked months" ON public.unlocked_months FOR ALL USING (true);
      `
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('RPC exec_sql failed:', errorText);
    console.log('\n⚠ The exec_sql RPC may not be enabled on your Supabase project.');
    console.log('\n✅ Please run this SQL manually in your Supabase Dashboard > SQL Editor:\n');
    console.log(`
CREATE TABLE IF NOT EXISTS public.unlocked_months (
    month TEXT PRIMARY KEY,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.unlocked_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view unlocked months" 
ON public.unlocked_months FOR SELECT USING (true);

CREATE POLICY "Service role can manage unlocked months" 
ON public.unlocked_months FOR ALL USING (true);
    `);
    return;
  }

  console.log('✅ Table created successfully!');

  // Verify
  const { data, error } = await supabase.from('unlocked_months').select('*').limit(1);
  if (error) {
    console.error('Verification failed:', error);
  } else {
    console.log('✅ Table verified. Current rows:', data);
  }
}

createTable().catch(console.error);
