import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

const isBdClient = (name: string) => {
  const low = String(name || '').toLowerCase().trim();
  return (
    low === 'bd' ||
    low.startsWith('bd ') ||
    low.startsWith('bd-') ||
    low.startsWith('bd -') ||
    low.startsWith('bd/') ||
    low.startsWith('bd –') ||
    low.startsWith('bd —')
  );
};

async function main() {
  console.log('--- Removing All Existing Revenue from BD Clients in Database ---');

  // 1. Fetch all clients
  const { data: clients, error: fetchErr } = await supabase
    .from('clients')
    .select('id, name, budget');

  if (fetchErr) {
    console.error('Failed to fetch clients:', fetchErr);
    return;
  }

  const bdClients = (clients || []).filter(c => isBdClient(c.name));
  console.log(`Found ${bdClients.length} BD clients in the system.`);

  // 2. Set client budget to 0 in clients table
  let clientUpdates = 0;
  for (const c of bdClients) {
    if (c.budget !== 0) {
      console.log(`Updating default budget to 0 for: "${c.name}" (was: ₹${c.budget})`);
      const { error: updateErr } = await supabase
        .from('clients')
        .update({ budget: 0 })
        .eq('id', c.id);
      
      if (updateErr) {
        console.error(`Error updating "${c.name}":`, updateErr);
      } else {
        clientUpdates++;
      }
    }
  }
  console.log(`Successfully set default budgets to 0 for ${clientUpdates} BD clients.`);

  // 3. Clear monthly budgets overrides for all BD clients
  const bdClientIds = bdClients.map(c => c.id);
  if (bdClientIds.length > 0) {
    console.log('\nChecking monthly_budgets overrides for these BD clients...');
    
    // Let's delete overrides or update budget to 0
    const { data: overrides, error: oFetchErr } = await supabase
      .from('monthly_budgets')
      .select('id, client_id, month, budget')
      .in('client_id', bdClientIds);

    if (oFetchErr) {
      console.error('Failed to fetch monthly overrides:', oFetchErr);
    } else {
      console.log(`Found ${overrides?.length || 0} monthly budget overrides for BD clients.`);
      let overrideUpdates = 0;
      for (const override of (overrides || [])) {
        if (override.budget !== 0) {
          console.log(`Updating monthly override for client ID ${override.client_id} for ${override.month} to 0 (was: ₹${override.budget})`);
          const { error: oUpdateErr } = await supabase
            .from('monthly_budgets')
            .update({ budget: 0 })
            .eq('id', override.id);

          if (oUpdateErr) {
            console.error(`Error updating monthly override ID ${override.id}:`, oUpdateErr);
          } else {
            overrideUpdates++;
          }
        }
      }
      console.log(`Successfully updated ${overrideUpdates} monthly budget overrides to 0.`);
    }
  }

  console.log('\n--- BD Revenue Database Cleanup Complete! ---');
}

main().catch(console.error);
