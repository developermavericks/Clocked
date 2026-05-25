const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getCleanString(cell) {
  if (!cell) return '';
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return (val.text || val.result || '').toString().trim();
  }
  return val.toString().trim();
}

async function sync() {
  const filePath = path.join(__dirname, '../../Credentials (1)_updated.xlsx');
  console.log(` 📖 Reading Excel workbook from: ${filePath}`);
  
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch (err) {
    console.error(`❌ Failed to read XLSX file: ${err.message}`);
    console.error('Please make sure you have downloaded the latest Google Sheet as "Credentials (2) (1).xlsx" and placed it in the workspace root.');
    process.exit(1);
  }

  // ==========================================
  // 1. SYNC CLIENTS
  // ==========================================
  console.log('\n--- 👥 Syncing Clients ---');
  const clientSheet = workbook.getWorksheet('clients');
  const excelClients = [];
  clientSheet.eachRow((row, i) => {
    if (i === 1) return; // skip header
    const name = getCleanString(row.getCell(1));
    const core = getCleanString(row.getCell(3));
    if (name) {
      excelClients.push({ name, core_owner: core || null });
    }
  });

  console.log(`Found ${excelClients.length} clients in Excel. Syncing to database...`);
  const { error: clientErr } = await supabase.from('clients').upsert(excelClients, { onConflict: 'name' });
  if (clientErr) {
    console.error('❌ Client Sync Error:', clientErr.message);
  } else {
    console.log('✅ Clients synced successfully!');
  }

  // Fetch updated clients from DB to build name -> ID mapping
  const { data: dbClients, error: fetchClientsErr } = await supabase.from('clients').select('id, name');
  if (fetchClientsErr) {
    console.error('❌ Failed to fetch clients from DB:', fetchClientsErr.message);
    process.exit(1);
  }
  const clientToId = dbClients.reduce((acc, c) => ({ ...acc, [c.name.toLowerCase().trim()]: c.id }), {});

  // ==========================================
  // 2. SYNC USERS & ROLES
  // ==========================================
  console.log('\n--- 👤 Syncing Users & Roles ---');
  const userSheet = workbook.getWorksheet('Users');
  const excelUsers = [];
  userSheet.eachRow((row, i) => {
    if (i === 1) return;
    const sub = getCleanString(row.getCell(1));
    const email = getCleanString(row.getCell(2)).toLowerCase();
    const name = getCleanString(row.getCell(3));
    const picture = getCleanString(row.getCell(4));
    
    if (email) {
      excelUsers.push({ sub: sub || null, email, name: name || null, picture: picture || null });
    }
  });

  // Read roles from roles sheet
  const roleSheet = workbook.getWorksheet('roles');
  const roleMap = {};
  if (roleSheet) {
    roleSheet.eachRow((row, i) => {
      if (i === 1) return;
      const email = getCleanString(row.getCell(2)).toLowerCase();
      const role = getCleanString(row.getCell(3));
      if (email && role) {
        roleMap[email] = role;
      }
    });
  }

  // Apply roles to users
  excelUsers.forEach(u => {
    if (roleMap[u.email]) {
      u.role = roleMap[u.email];
    }
  });

  console.log(`Found ${excelUsers.length} users in Excel. Syncing to database...`);
  const { error: userErr } = await supabase.from('users').upsert(excelUsers, { onConflict: 'email' });
  if (userErr) {
    console.error('❌ User Sync Error:', userErr.message);
  } else {
    console.log('✅ Users & Roles synced successfully!');
  }

  // Fetch updated users from DB to build email -> ID mapping
  const { data: dbUsers, error: fetchUsersErr } = await supabase.from('users').select('id, email');
  if (fetchUsersErr) {
    console.error('❌ Failed to fetch users from DB:', fetchUsersErr.message);
    process.exit(1);
  }
  const emailToId = dbUsers.reduce((acc, u) => ({ ...acc, [u.email.toLowerCase().trim()]: u.id }), {});

  // ==========================================
  // 3. SYNC TEAMS (MANAGERS & MEMBERS)
  // ==========================================
  console.log('\n--- 🤝 Syncing Teams ---');
  const teamSheet = workbook.getWorksheet('teams');
  const excelTeams = [];
  if (teamSheet) {
    teamSheet.eachRow((row, i) => {
      if (i === 1) return;
      const managerEmail = getCleanString(row.getCell(2)).toLowerCase();
      const memberEmail = getCleanString(row.getCell(4)).toLowerCase();
      if (managerEmail && memberEmail && emailToId[managerEmail] && emailToId[memberEmail]) {
        excelTeams.push({ manager_id: emailToId[managerEmail], member_id: emailToId[memberEmail] });
      }
    });

    console.log(`Found ${excelTeams.length} team relations. Syncing to database...`);
    const { error: teamErr } = await supabase.from('teams').upsert(excelTeams, { onConflict: 'manager_id, member_id' });
    if (teamErr) {
      console.error('❌ Team Sync Error:', teamErr.message);
    } else {
      console.log('✅ Teams synced successfully!');
    }
  }

  // ==========================================
  // 4. SYNC WEEKLY ALLOCATIONS (ACTUALS) WITH ID MAPPING!
  // ==========================================
  console.log('\n--- 📅 Syncing Weekly Allocations (Actuals) ---');
  const weeklySheet = workbook.getWorksheet('allocations_weekly');
  if (!weeklySheet) {
    console.warn('⚠️ No allocations_weekly sheet found in Excel.');
  } else {
    const weeklyAllocations = [];
    const missingClients = new Set();
    const missingUsers = new Set();

    weeklySheet.eachRow((row, i) => {
      if (i === 1) return;
      const id = getCleanString(row.getCell(1));
      const email = getCleanString(row.getCell(5)).toLowerCase();
      const clientName = getCleanString(row.getCell(7));
      const category = getCleanString(row.getCell(8)) || null;
      const hours = parseFloat(getCleanString(row.getCell(9)));
      const notes = getCleanString(row.getCell(10)) || null;
      const monthRaw = row.getCell(2).value;
      const startRaw = row.getCell(13).value;
      const endRaw = row.getCell(14).value;
      const week_code = getCleanString(row.getCell(3)) || null;

      if (!id) return; // skip rows without ID
      if (!email || isNaN(hours)) return;

      const user_id = emailToId[email];
      if (!user_id) {
        missingUsers.add(email);
        return;
      }

      let client_id = null;
      if (clientName) {
        client_id = clientToId[clientName.toLowerCase().trim()];
        if (!client_id) {
          missingClients.add(clientName);
        }
      }

      const formatDate = (val) => {
        if (val instanceof Date) return val.toISOString().split('T')[0];
        if (typeof val === 'string') return val.split('T')[0];
        return String(val || '');
      };

      const month = monthRaw instanceof Date 
        ? monthRaw.toISOString().slice(0, 7) 
        : String(monthRaw || '').slice(0, 7);

      weeklyAllocations.push({
        id,
        user_id,
        month,
        client_id, // temporarily null if client is missing
        clientNameRaw: clientName, // keep to resolve later
        category,
        hours,
        notes,
        start_date: formatDate(startRaw),
        end_date: formatDate(endRaw),
        week_code
      });
    });

    // 4a. Handle Missing Clients dynamically!
    if (missingClients.size > 0) {
      console.log(`🔍 Detected ${missingClients.size} new clients in allocations that are not in clients table. Creating them...`);
      const newClientsPayload = Array.from(missingClients).map(name => ({ name }));
      const { error: insertClientsErr } = await supabase.from('clients').upsert(newClientsPayload, { onConflict: 'name' });
      if (insertClientsErr) {
        console.error('❌ Error creating missing clients:', insertClientsErr.message);
      } else {
        // Refetch clients and update mapping
        const { data: dbClientsRefetched } = await supabase.from('clients').select('id, name');
        const refetchedClientToId = dbClientsRefetched.reduce((acc, c) => ({ ...acc, [c.name.toLowerCase().trim()]: c.id }), {});
        
        // Update client_id for weeklyAllocations
        weeklyAllocations.forEach(wa => {
          if (wa.clientNameRaw && !wa.client_id) {
            wa.client_id = refetchedClientToId[wa.clientNameRaw.toLowerCase().trim()] || null;
          }
        });
        console.log('✅ Missing clients auto-created and mapped successfully!');
      }
    }

    if (missingUsers.size > 0) {
      console.warn(`⚠️ Warning: ${missingUsers.size} allocations skipped because the users do not exist in the Users sheet:`, Array.from(missingUsers));
    }

    // 4b. Perform Batched Upsert
    console.log(`Upserting ${weeklyAllocations.length} weekly allocations in batches of 1000...`);
    let successCount = 0;
    for (let i = 0; i < weeklyAllocations.length; i += 1000) {
      const batch = weeklyAllocations.slice(i, i + 1000).map(({ clientNameRaw, ...rest }) => rest);
      const { error: allocErr } = await supabase.from('allocations_weekly').upsert(batch, { onConflict: 'id' });
      if (allocErr) {
        console.error(`❌ Weekly Allocation Batch ${i} Error:`, allocErr.message);
      } else {
        successCount += batch.length;
        console.log(`  Processed ${successCount}/${weeklyAllocations.length} weekly allocations...`);
      }
    }
    console.log(`✅ Weekly allocations sync complete! Successfully synced ${successCount} entries.`);
  }

  // ==========================================
  // 5. SYNC MONTHLY ALLOCATIONS (PROJECTED) WITH ID MAPPING!
  // ==========================================
  console.log('\n--- 📅 Syncing Monthly Allocations (Projected) ---');
  const monthlySheet = workbook.getWorksheet('allocations_monthly');
  if (!monthlySheet) {
    console.warn('⚠️ No allocations_monthly sheet found in Excel.');
  } else {
    const monthlyAllocations = [];
    const missingClients = new Set();

    monthlySheet.eachRow((row, i) => {
      if (i === 1) return;
      const id = getCleanString(row.getCell(1));
      const monthRaw = row.getCell(2).value;
      const email = getCleanString(row.getCell(5)).toLowerCase();
      const clientName = getCleanString(row.getCell(7));
      const category = getCleanString(row.getCell(8)) || null;
      const hours = parseFloat(getCleanString(row.getCell(9)));
      const notes = getCleanString(row.getCell(10)) || null;

      if (!id) return;
      if (!email || isNaN(hours)) return;

      const user_id = emailToId[email];
      if (!user_id) return; // skip if user doesn't exist

      let client_id = null;
      if (clientName) {
        client_id = clientToId[clientName.toLowerCase().trim()];
        if (!client_id) {
          missingClients.add(clientName);
        }
      }

      const month = monthRaw instanceof Date 
        ? monthRaw.toISOString().slice(0, 7) 
        : String(monthRaw || '').slice(0, 7);

      monthlyAllocations.push({
        id,
        user_id,
        month,
        client_id,
        clientNameRaw: clientName,
        category,
        hours,
        notes
      });
    });

    // 5a. Handle Missing Clients for Monthly
    if (missingClients.size > 0) {
      console.log(`🔍 Detected ${missingClients.size} new clients in monthly allocations. Creating them...`);
      const newClientsPayload = Array.from(missingClients).map(name => ({ name }));
      await supabase.from('clients').upsert(newClientsPayload, { onConflict: 'name' });
      
      const { data: dbClientsRefetched } = await supabase.from('clients').select('id, name');
      const refetchedClientToId = dbClientsRefetched.reduce((acc, c) => ({ ...acc, [c.name.toLowerCase().trim()]: c.id }), {});
      
      monthlyAllocations.forEach(ma => {
        if (ma.clientNameRaw && !ma.client_id) {
          ma.client_id = refetchedClientToId[ma.clientNameRaw.toLowerCase().trim()] || null;
        }
      });
    }

    console.log(`Upserting ${monthlyAllocations.length} monthly allocations...`);
    let successCount = 0;
    for (let i = 0; i < monthlyAllocations.length; i += 1000) {
      const batch = monthlyAllocations.slice(i, i + 1000).map(({ clientNameRaw, ...rest }) => rest);
      const { error: allocErr } = await supabase.from('allocations_monthly').upsert(batch, { onConflict: 'id' });
      if (allocErr) {
        console.error(`❌ Monthly Allocation Batch ${i} Error:`, allocErr.message);
      } else {
        successCount += batch.length;
        console.log(`  Processed ${successCount}/${monthlyAllocations.length} monthly allocations...`);
      }
    }
    console.log(`✅ Monthly allocations sync complete! Successfully synced ${successCount} entries.`);
  }

  console.log('\n🌟 Synchronization process finished successfully! 🌟');
}

sync().catch(console.error);
