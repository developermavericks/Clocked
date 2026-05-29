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

const userList = `
Aayushi	Akhouri	Ila
Jyoshitha 	Unkili	Nikita Hooper
Rajvi 	Bhansali	Mitali Darbari
Nikita	Hooper	Mitali Darbari
Reshita	Midya	Srishtee
Aditya	Kumar Mehta	Chetan
Mahek 	Chacha	Shrestha
Ridhi 	Pandita	Muskaan Bhatia
Sanya 	Maini	Ishmeet
Shreshtha 	Chaturvedi	Mahek Pandey
Nikita	Chaurasia	Akshay
Disha 	Kalra	Kavita
Udbhav 	Singh	Anil
Joyeta 	Debnath	Akshay
J Surya	Narayana	Ishmeet
Mohamed	Hisham	Kavita
Apurva	.	Pavithra
Abhilasha	Sharma	Shrestha
Srishti	Chanda	Manaswi
Anoushka	Aristotle	Akshay
Ananya	Gulati	Srishtee
Shinjini	Roy	Anil
Neha	Pasupuleti	Muskaan Bhatia
Vishakha	Bauddh	Samrat
Ritika	Goel	Gaurav
Bhavya	Joshi	Muskaan Bhatia
Ishmeet	Singh Bedi	Akshay
Ariba	Neyaz	Samrat
Muskaan	Harjai	Aashna
Vibhu	Varshney	Samrat
Muskaan	Bhardwaj	Mahek Pandey
Riya	Rupani	Archana
Sneh	S Jain	Akshay
Kashish	Ahuja	Vibhuti
Manaswi	.	Mitali Darbari
Kavita	Singh	Vibhuti
Avarna	Adukia	Alisha
Grishma	Uchil	Srishtee
Manvi	Singh	Ila
Pooja	Rana	Chetan
Varun	Pawar	Mahek Pandey
Tonmoyee	Kashyap	Shrestha
Rishika	Bujurke	Shrestha
Laveena	Giamalani	Rajvi
Gaurav	Tuli	Chetan
Akshay	Brave	Archana
Ila	Upadhyaya	Smriti
Aashna	Sharma	Chetan
Sushant	Pal	Ananya
Anil	Kapoor	Gaurav
Snigdha	Sharma	Muskaan Bhatia
Avinash	Verma	Chetan
Rohan	Jolly	Akshay
Shrestha	Banerjee	Smriti
Harshita	Mathur	Chhavi
Drishti	Checker	Anil
Ritik	Pandey	Ila
Sanya	Prasad	Pavithra
Alisha	Bhasin	Smriti
Ananya	Agrawal	Anil
Priyadarshini	Singh	Pavithra
Chetan	Mahajan	
Smriti	Raghunandan	Chetan
Triyanshi	Parihar	Archana
Mansi	Ganda	Shrestha
Archana	Thomas	Chetan
Mitali Darbari	Prakash	Chetan
Mahek	Pandey	Archana
Jayeeta	Chowdhury	Archana
Pavithra	Ramesh	Smriti
Srishtee	Sharma	Mitali Darbari
Chhavi	Arora	Smriti
Aditya	Sharma	Gaurav
Brinda	Sridhar	Smriti
Kyle	Mendonca	Samrat
Vibhuti	Tandon	Mitali Darbari
Shivani	Singh	Avinash
Samrat	Nath	Gaurav
Muskaan	Bhatia	Mitali Darbari
Khushi	Batra	Smriti
Vanshika	Srivastava	Archana
Udita	Singhal	Srishtee
Harprateek	.	Vibhuti
		
Reshita	Midya	Muskaan Bhardwaj
Nidhi 	Kaushal	Priya
Divyant 	Goel	Kavita
Deepthyy 	Radhkrishnan	Pavithra
Raayan 	Ukil	Kavita
Nina 	Tresa Alex	Anoushka Aristotle
Pranay 	Ghadigaonkar	Anil
Ansh 	Maheshwari	Anil
Sameera	Thakur	Chhavi
Hetavi	Shah	Ishmeet
Nidhi 	Agrawal	Srishti Chanda
Renita 	Philomena	Ila
Ishita 	Awasthi	Snigdha
Divyansh 	Sharma	Chetan
Satyam 	Kumar	Chetan
Arun 	Kumar	Chetan
`;

interface ParseRow {
  memberFirst: string;
  memberLast: string;
  fullName: string;
  expectedManager: string;
}

async function verify() {
  // 1. Parse user's spreadsheet text
  const rows: ParseRow[] = [];
  userList.split('\n').forEach(line => {
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length >= 3) {
      const first = parts[0];
      const last = parts[1];
      const manager = parts[2];
      const fullName = `${first} ${last}`.replace(/\s+/g, ' ').trim();
      if (fullName && manager) {
        rows.push({
          memberFirst: first,
          memberLast: last,
          fullName,
          expectedManager: manager
        });
      }
    }
  });

  // 2. Fetch live users and teams
  const { data: rawUsers } = await supabase.from('users').select('id, name, email');
  const { data: rawTeams } = await supabase.from('teams').select('manager_id, member_id');

  const dbUsers = (rawUsers || []) as any[];
  const dbTeams = (rawTeams || []) as any[];

  const userMap = new Map<string, any>();
  dbUsers.forEach(u => userMap.set(u.id, u));

  // Build direct live mapping: Member User ID -> Manager User Object
  const liveTeamMap = new Map<string, any>();
  dbTeams.forEach(t => {
    const manager = userMap.get(t.manager_id);
    if (manager) {
      liveTeamMap.set(t.member_id, manager);
    }
  });

  // Helper function to find DB User by name (case-insensitive fuzzy matching)
  function findDbUser(nameStr: string) {
    if (!nameStr) return null;
    const searchLower = nameStr.toLowerCase().replace(/[^a-z]/g, '');
    
    // First, try exact name match
    let match = dbUsers?.find(u => (u.name || '').toLowerCase() === nameStr.toLowerCase());
    if (match) return match;

    // Fuzzy matching (if name contains the search term or vice versa)
    match = dbUsers?.find(u => {
      const dbLower = (u.name || '').toLowerCase().replace(/[^a-z]/g, '');
      return dbLower.includes(searchLower) || searchLower.includes(dbLower);
    });

    if (match) return match;

    // Email-based matching (e.g. if email starts with first name)
    match = dbUsers?.find(u => {
      const emailPrefix = u.email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
      return emailPrefix === searchLower;
    });

    return match || null;
  }

  const matched: string[] = [];
  const mismatched: string[] = [];
  const missingMember: string[] = [];

  rows.forEach(r => {
    const memberUser = findDbUser(r.fullName) || findDbUser(r.memberFirst);
    const expectedManagerUser = findDbUser(r.expectedManager);

    if (!memberUser) {
      missingMember.push(`👤 "${r.fullName}" expected to report to "${r.expectedManager}" (Member not found in database users list)`);
      return;
    }

    const liveManager = liveTeamMap.get(memberUser.id);

    if (!liveManager) {
      mismatched.push(`❌ ${memberUser.name} (${memberUser.email}): Expected manager is "${r.expectedManager}", but has NO manager assigned in the app.`);
      return;
    }

    // Check if live manager matches expected manager
    const liveManagerNameClean = (liveManager.name || '').toLowerCase().replace(/[^a-z]/g, '');
    const expectedManagerNameClean = r.expectedManager.toLowerCase().replace(/[^a-z]/g, '');

    // Allow fuzzy match for managers (e.g. "Muskaan Bhatia" vs "muskaan")
    const isManagerMatch = liveManagerNameClean.includes(expectedManagerNameClean) || expectedManagerNameClean.includes(liveManagerNameClean);

    if (isManagerMatch) {
      matched.push(`✅ ${memberUser.name} (${memberUser.email}) reports to ${liveManager.name} (Matches expected: ${r.expectedManager})`);
    } else {
      mismatched.push(`❌ ${memberUser.name} (${memberUser.email}): Expected manager is "${r.expectedManager}", but is currently assigned to "${liveManager.name}" in the app.`);
    }
  });

  console.log('\n======================================================');
  console.log('📊 REPORTING RELATIONSHIP COMPLIANCE AUDIT REPORT');
  console.log('======================================================');
  console.log(`- Relationships Fully Matched:     ${matched.length}`);
  console.log(`- Mismatches / Missing Managers:   ${mismatched.length}`);
  console.log(`- Members Missing from DB Registry: ${missingMember.length}`);
  console.log('======================================================\n');

  if (mismatched.length > 0) {
    console.log('⚠️ MISMATCHED ASSIGNMENTS IN APP:');
    mismatched.forEach(m => console.log(m));
  }

  if (missingMember.length > 0) {
    console.log('\n⚠️ MEMBERS EXPECTED BUT NOT FOUND IN DATABASE REGISTRY:');
    missingMember.forEach(m => console.log(m));
  }
}

verify();
