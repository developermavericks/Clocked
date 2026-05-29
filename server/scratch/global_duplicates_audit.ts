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

async function globalAudit() {
  console.log('Auditing duplicates globally in allocations_weekly...');

  // We can query Supabase with postgrest using RPC or a custom query, 
  // but since we don't have direct SQL RPC, we can fetch all records for January 2026 
  // and see if there are exact duplicates inside January!
  const { data: januaryRows, error } = await supabase
    .from('allocations_weekly')
    .select('id, user_id, month, client_id, category, hours, notes, start_date')
    .eq('month', '2026-01');

  if (error) {
    console.error('Error fetching January records:', error);
    return;
  }

  console.log(`Fetched ${januaryRows.length} rows for January 2026.`);

  const seen = new Map<string, any[]>();
  let duplicatesCount = 0;

  januaryRows.forEach(row => {
    // Generate a unique hash key for comparison
    const key = `${row.user_id}_${row.client_id}_${row.start_date}_${row.category}_${row.hours}_${(row.notes || '').trim()}`;
    if (!seen.has(key)) {
      seen.set(key, [row]);
    } else {
      seen.get(key)!.push(row);
      duplicatesCount++;
    }
  });

  console.log(`Total duplicates found inside January 2026: ${duplicatesCount}`);

  if (duplicatesCount > 0) {
    console.log('\nSample duplicate group:');
    let displayed = 0;
    for (const [key, group] of seen.entries()) {
      if (group.length > 1 && displayed < 3) {
        console.log(`\nKey: ${key}`);
        group.forEach(row => {
          console.log(`  - ID: ${row.id}`);
        });
        displayed++;
      }
    }
  }
}

globalAudit();
