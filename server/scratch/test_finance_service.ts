import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getCoreMasterAllocations } from '../src/services/financeService';

async function test() {
  console.log('Calling getCoreMasterAllocations for 2026-05...');
  try {
    const data = await getCoreMasterAllocations({
      month: '2026-05',
      group_bd: false,
      group_leave: false,
      group_internal: false
    });
    console.log('Result details:');
    console.log('- Month:', data.month);
    console.log('- Clients Count:', data.clients ? data.clients.length : 'N/A');
    console.log('- Rows Count:', data.rows ? data.rows.length : 'N/A');
    console.log('- Raw Allocations Count:', data.rawAllocations ? data.rawAllocations.length : 'N/A');
    if (data.clients && data.clients.length > 0) {
      console.log('Sample clients:', data.clients.slice(0, 3));
    }
    if (data.rows && data.rows.length > 0) {
      console.log('Sample rows:', data.rows.slice(0, 3));
    }
  } catch (err) {
    console.error('Error running service method:', err);
  }
}

test().catch(console.error);
