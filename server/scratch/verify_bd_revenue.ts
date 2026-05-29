import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getCoreMasterAllocations } from '../src/services/financeService';

async function test() {
  console.log('Fetching allocations for May 2026 to verify BD client revenue...');
  try {
    const data = await getCoreMasterAllocations({
      month: '2026-05',
      group_bd: false,
      group_leave: false,
      group_internal: false
    });

    const bdClients = data.clients.filter(c => {
      const low = c.name.toLowerCase();
      return (
        low === 'bd' ||
        low.startsWith('bd ') ||
        low.startsWith('bd-') ||
        low.startsWith('bd -') ||
        low.startsWith('bd/') ||
        low.startsWith('bd –') ||
        low.startsWith('bd —')
      );
    });

    console.log(`Found ${bdClients.length} BD clients in the results.`);
    let nonZeroBd = 0;
    bdClients.forEach(c => {
      console.log(`- BD Client Name: "${c.name}", Core: "${c.core}", Budget/Revenue in service output: ${c.budget}`);
      if (c.budget !== 0) {
        nonZeroBd++;
      }
    });

    if (nonZeroBd === 0) {
      console.log('✅ Success: All BD clients have strictly 0.00 revenue!');
    } else {
      console.error('❌ Error: Found BD clients with non-zero revenue!');
    }
  } catch (err) {
    console.error('Verification Error:', err);
  }
}

test().catch(console.error);
