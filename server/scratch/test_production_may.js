const { getCoreMasterAllocations } = require('../dist/services/financeService');

async function test() {
  console.log("Calling getCoreMasterAllocations for 2026-05...");
  try {
    const data = await getCoreMasterAllocations({
      month: '2026-05',
      group_bd: false,
      group_leave: false,
      group_internal: false
    });

    let sum = 0;
    data.rows.forEach(r => {
      sum += r.totalHours || 0;
    });

    console.log(`Sum of totalHours in rows: ${sum}`);
    
    // Check if Lunch Break exists in clients list
    const lunchBreakClient = data.clients.find(c => c.name === 'Lunch Break');
    console.log(`Lunch Break client column exists: ${!!lunchBreakClient}`);

    // Check if there are any other columns that are not in our list
    console.log(`Total client columns in response: ${data.clients.length}`);
  } catch (err) {
    console.error(err);
  }
}

test();
