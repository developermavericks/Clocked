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

async function listCurrentTeams() {
  console.log('Querying all active manager-member relationships...');
  
  // Fetch teams table
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('manager_id, member_id');

  if (tErr) {
    console.error('Error fetching teams:', tErr);
    return;
  }

  // Fetch all users to resolve names and emails
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, name, email');

  if (uErr) {
    console.error('Error fetching users:', uErr);
    return;
  }

  const userMap = new Map<string, { name: string; email: string }>();
  users?.forEach(u => {
    userMap.set(u.id, { name: u.name || 'Unnamed User', email: u.email });
  });

  // Group members under managers
  const managerGroups = new Map<string, string[]>();

  teams?.forEach(t => {
    const manager = userMap.get(t.manager_id);
    const member = userMap.get(t.member_id);
    
    if (manager && member) {
      const managerLabel = `${manager.name} (${manager.email})`;
      const memberLabel = `${member.name} (${member.email})`;
      
      if (!managerGroups.has(managerLabel)) {
        managerGroups.set(managerLabel, []);
      }
      managerGroups.get(managerLabel)!.push(memberLabel);
    }
  });

  console.log('\n--- ACTIVE MANAGER-MEMBER REPORTING LIST ---');
  if (managerGroups.size === 0) {
    console.log('No reporting relationships found.');
  } else {
    for (const [manager, members] of managerGroups.entries()) {
      console.log(`\nManager: 👑 ${manager}`);
      members.sort().forEach((m, idx) => {
        console.log(`  └─ Member ${idx + 1}: 👤 ${m}`);
      });
    }
  }
}

listCurrentTeams();
