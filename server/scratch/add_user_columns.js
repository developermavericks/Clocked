const https = require('https');
const url = require('url');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sqlQueries = `
  -- Add joining_date and exit_date columns to public.users table
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT '2025-11-01';
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exit_date DATE;
`;

const parsedUrl = url.parse(`${supabaseUrl}/rest/v1/rpc/exec_sql`);

const postData = JSON.stringify({
  sql: sqlQueries
});

const options = {
  hostname: parsedUrl.hostname,
  port: parsedUrl.port || 443,
  path: parsedUrl.path,
  method: 'POST',
  headers: {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Attempting to execute ALTER TABLE on public.users via Supabase RPC HTTPS request...');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Columns added successfully to public.users table!');
    } else {
      console.error(`❌ RPC failed with status code ${res.statusCode}:`, body);
    }
  });
});

req.on('error', (e) => {
  console.error('Migration failed with request error:', e);
});

req.write(postData);
req.end();
