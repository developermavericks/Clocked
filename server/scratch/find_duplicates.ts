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

async function findDuplicates() {
  console.log('Checking for duplicates in allocations_weekly...');

  // Let's fetch the first 100 rows
  const { data: rows, error } = await supabase
    .from('allocations_weekly')
    .select('id, user_id, month, client_id, category, hours, notes, start_date')
    .limit(100);

  if (error) {
    console.error('Error fetching allocations:', error);
    return;
  }

  // Check if we can find exact duplicates in these 100 rows
  const matches: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      const match = a.user_id === b.user_id &&
                    a.client_id === b.client_id &&
                    a.month === b.month &&
                    a.category === b.category &&
                    Number(a.hours) === Number(b.hours) &&
                    a.notes === b.notes &&
                    a.start_date === b.start_date;
      
      if (match) {
        matches.push(`Duplicate pair found:\n- ID: ${a.id}\n- ID: ${b.id}\n- User: ${a.user_id}, Client: ${a.client_id}, Date: ${a.start_date}, Hours: ${a.hours}`);
      }
    }
  }

  if (matches.length > 0) {
    console.log(`\n⚠️ Found ${matches.length} duplicate pairs in the first 100 sample rows!`);
    console.log(matches.slice(0, 5).join('\n\n'));
  } else {
    console.log('\n✅ No duplicates found in the first 100 sample rows. Checking globally...');
  }
}

findDuplicates();
