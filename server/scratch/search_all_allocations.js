const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function search() {
  const { data: row } = await supabase.from('allocations_weekly').select('*').limit(1);
  console.log('Columns in allocations_weekly:', Object.keys(row[0] || {}));

  const { data: matches, error } = await supabase
    .from('allocations_weekly')
    .select('*, clients(name)')
    .or('notes.ilike.%111%,notes.ilike.%target%');

  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${matches.length} matches in allocations_weekly:`);
    matches.forEach(m => {
      console.log(`- User ID: ${m.user_id}, Client: ${m.clients?.name}, Hours: ${m.hours}, Notes: "${m.notes}", Date: ${m.month}`);
    });
  }
}

search().catch(console.error);
