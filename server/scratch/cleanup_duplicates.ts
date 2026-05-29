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

async function runCleanup() {
  console.log('🚀 Starting Supabase allocations_weekly duplicate cleanup...');
  
  // 1. Fetch all weekly allocations with pagination
  let allRecords: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  console.log('Fetching all weekly allocations from database...');
  while (true) {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('id, user_id, month, client_id, category, hours, notes, start_date')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error('Error fetching records:', error);
      return;
    }
    
    if (!data || data.length === 0) break;
    allRecords = allRecords.concat(data);
    
    if (data.length < pageSize) break;
    page++;
    if (page % 5 === 0) {
      console.log(`Fetched ${allRecords.length} records so far...`);
    }
  }
  
  console.log(`\nFetched ${allRecords.length} total records from allocations_weekly.`);
  
  // 2. Identify duplicate Twin IDs
  const seenKeys = new Map<string, string>(); // key -> first seen ID
  const duplicateIdsToDelete: string[] = [];
  
  allRecords.forEach(row => {
    // Standardize key components
    const userId = row.user_id;
    const clientId = row.client_id;
    const dateStr = row.start_date || '';
    const category = row.category || '';
    const hours = Number(row.hours).toFixed(2);
    const notesClean = (row.notes || '').trim().toLowerCase();
    
    const hashKey = `${userId}_${clientId}_${dateStr}_${category}_${hours}_${notesClean}`;
    
    if (!seenKeys.has(hashKey)) {
      seenKeys.set(hashKey, row.id);
    } else {
      duplicateIdsToDelete.push(row.id);
    }
  });
  
  console.log(`Total unique records to keep:  ${seenKeys.size}`);
  console.log(`Total duplicate twin records to delete: ${duplicateIdsToDelete.length}`);
  
  if (duplicateIdsToDelete.length === 0) {
    console.log('✅ No duplicates found in allocations_weekly. Database is already clean!');
    return;
  }
  
  // 3. Delete duplicate records in chunks of 200
  console.log(`\nStarting deletion of ${duplicateIdsToDelete.length} duplicates in chunks of 200...`);
  const chunkSide = 200;
  let deletedCount = 0;
  
  for (let i = 0; i < duplicateIdsToDelete.length; i += chunkSide) {
    const chunk = duplicateIdsToDelete.slice(i, i + chunkSide);
    
    const { error: delErr } = await supabase
      .from('allocations_weekly')
      .delete()
      .in('id', chunk);
      
    if (delErr) {
      console.error(`Error deleting chunk starting at index ${i}:`, delErr);
      return;
    }
    
    deletedCount += chunk.length;
    console.log(`Deleted ${deletedCount}/${duplicateIdsToDelete.length} duplicate records...`);
  }
  
  console.log('\n======================================================');
  console.log('🎉 DATABASE CLEANUP SUCCESSFULLY COMPLETED!');
  console.log(`- Safely removed duplicate records: ${deletedCount}`);
  console.log('- Remaining unique records kept:    ', seenKeys.size);
  console.log('======================================================\n');
}

runCleanup();
