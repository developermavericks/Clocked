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
Sanya 	Maini	Ishmeet			Move to Kavita
Shreshtha 	Chaturvedi	Mahek Pandey			
Nikita	Chaurasia	Akshay			
Disha 	Kalra	Kavita			
Udbhav 	Singh	Anil			
Joyeta 	Debnath	Akshay			
J Surya	Narayana	Ishmeet	 Akshay Brave		
Mohamed	Hisham	Kavita	Riya		
Apurva	.	Pavithra	 Smriti Raghunandan		
Abhilasha	Sharma	Shrestha	 Smriti Raghunandan		
Srishti	Chanda	Manaswi	 Smriti Raghunandan		
Anoushka	Aristotle	Akshay	 Mitali Darbari Prakash		
Ananya	Gulati	Srishtee	Mitali Darbari Prakash		
Shinjini	Roy	Anil			
Neha	Pasupuleti	Muskaan Bhatia	Maverick -86 Vibhuti Tandon	Maverick -65 Mitali Darbari Prakash	
Vishakha	Bauddh	Samrat	Maverick - 148 Gaurav Tuli		
Ritika	Goel	Gaurav	Maverick -68 Chetan Mahajan		
Bhavya	Joshi	Muskaan Bhatia	Maverick -86 Vibhuti Tandon	Maverick -65 Mitali Darbari Prakash	
Ishmeet	Singh Bedi	Akshay	Maverick -65 Mitali Darbari Prakash	Maverick -36 Archana Thomas	
Ariba	Neyaz	Samrat	Maverick - 148 Gaurav Tuli		
Muskaan	Harjai	Aashna	Maverick -68 Chetan Mahajan		
Vibhu	Varshney	Samrat	Maverick - 148 Gaurav Tuli		
Muskaan	Bhardwaj	Mahek Pandey	Maverick -65 Mitali Darbari Prakash		
Riya	Rupani	Archana	Maverick -68 Chetan Mahajan		
Sneh	S Jain	Akshay	Maverick -68 Chetan Mahajan		
Kashish	Ahuja	Vibhuti	Maverick -65 Mitali Darbari Prakash		
Manaswi	.	Mitali Darbari	Maverick -68 Chetan Mahajan		
Kavita	Singh	Vibhuti	Maverick -65 Mitali Darbari Prakash		
Avarna	Adukia	Alisha	Maverick -65 Mitali Darbari Prakash		
Grishma	Uchil	Srishtee	Maverick -65 Mitali Darbari Prakash		
Manvi	Singh	Ila	Maverick -65 Mitali Darbari Prakash		
Pooja	Rana	Chetan			
Varun	Pawar	Mahek Pandey	Maverick -65 Mitali Darbari Prakash		
Tonmoyee	Kashyap	Shrestha	Maverick -66 Smriti Raghunandan		
Rishika	Bujurke	Shrestha	Maverick -66 Smriti Raghunandan		
Laveena	Giamalani	Rajvi	Maverick -65 Mitali Darbari Prakash		
Gaurav	Tuli	Chetan			
Akshay	Brave	Archana	Maverick -68 Chetan Mahajan		
Ila	Upadhyaya	Smriti	Maverick -68 Chetan Mahajan		
Aashna	Sharma	Chetan			
Sushant	Pal	Ananya	Maverick -132 Anil Kapoor	Maverick -93 Samrat Nath	
Anil	Kapoor	Gaurav	Maverick -68 Chetan Mahajan		
Snigdha	Sharma	Muskaan Bhatia	Maverick -65 Mitali Darbari Prakash		change
Avinash	Verma	Chetan			
Rohan	Jolly	Akshay	Maverick -68 Chetan Mahajan		
Shrestha	Banerjee	Smriti	Maverick -68 Chetan Mahajan		
Harshita	Mathur	Chhavi	Maverick -86 Vibhuti Tandon	Maverick -65 Mitali Darbari Prakash	
Drishti	Checker	Anil	Maverick - 148 Gaurav Tuli		
Ritik	Pandey	Ila	Maverick -66 Smriti Raghunandan		
Sanya	Prasad	Pavithra	Maverick -66 Smriti Raghunandan		
Alisha	Bhasin	Smriti	Maverick -65 Mitali Darbari Prakash	Maverick -36 Archana Thomas	
Ananya	Agrawal	Anil	Maverick - 148 Gaurav Tuli		
Priyadarshini	Singh	Pavithra	Maverick -66 Smriti Raghunandan		
Chetan	Mahajan				
Smriti	Raghunandan	Chetan			
Triyanshi	Parihar	Archana	Maverick -65 Mitali Darbari Prakash		
Mansi	Ganda	Shrestha	Maverick -66 Smriti Raghunandan		
Archana	Thomas	Chetan			
Mitali Darbari	Prakash	Chetan			
Mahek	Pandey	Archana	Maverick -68 Chetan Mahajan		
Jayeeta	Chowdhury	Archana	Maverick -68 Chetan Mahajan		
Pavithra	Ramesh	Smriti	Maverick -68 Chetan Mahajan		
Srishtee	Sharma	Mitali Darbari	Maverick -68 Chetan Mahajan		
Chhavi	Arora	Smriti	Maverick -66 Smriti Raghunandan		
Aditya	Sharma	Gaurav	Maverick -68 Chetan Mahajan		
Brinda	Sridhar	Smriti	Maverick -68 Chetan Mahajan		
Kyle	Mendonca	Samrat 			
Vibhuti	Tandon	Mitali Darbari	Maverick -68 Chetan Mahajan		
Shivani	Singh	Avinash	Maverick -68 Chetan Mahajan		
Samrat	Nath	Gaurav	Maverick -68 Chetan Mahajan		
Muskaan	Bhatia	Mitali Darbari	Maverick -65 Mitali Darbari Prakash		
Khushi	Batra	Smriti	Maverick -68 Chetan Mahajan		
Vanshika	Srivastava	Archana	Maverick -36 Archana Thomas		
Udita	Singhal	Srishtee	Maverick -65 Mitali Darbari Prakash		
Harprateek	.	Vibhuti	Maverick -65 Mitali Darbari Prakash		
					
Reshita	Midya	Muskaan Bhardwaj	14-Apr-2026	Muskaan Bhardwaj	
Nidhi 	Kaushal	Priya	15-Apr-2026	Priya	
Divyant 	Goel	Kavita	23-Apr-2026	Kavita	
Deepthyy 	Radhkrishnan	Pavithra	7-May-2026	Pavithra	
Raayan 	Ukil	Kavita	16-May-2026	Kavita	
Nina 	Tresa Alex	Anoushka Aristotle	31-May-2026		
Pranay 	Ghadigaonkar	Anil	2-Jun-2026	Anil	
Ansh 	Maheshwari	Anil	4th June 2026	Anil	
Sameera	Thakur	Chhavi 	6-Jun-2026	Chhavi 	
Hetavi	Shah	Ishmeet	6-Jun-2026	Ishmeet	
Nidhi 	Agrawal	Srishti Chanda	6-Jun-2026	Srishti Chanda	
Renita 	Philomena	Ila	15-Jun-2026	Ila	
Ishita 	Awasthi	Snigdha	15-Jun-2026	Snigdha	
Divyansh 	Sharma	Chetan 	27-Jul-2026	Chetan 	
Satyam 	Kumar	Chetan 	27-Jul-2026	Chetan 	
Arun 	Kumar	Chetan 	27-Jul-2026	Chetan 	
`;

interface ParseRow {
  fullName: string;
  expectedManager: string;
  extraManager1?: string;
  extraManager2?: string;
}

async function verify() {
  const rows: ParseRow[] = [];
  userList.split('\n').forEach(line => {
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length >= 3) {
      const first = parts[0];
      const last = parts[1];
      const manager = parts[2];
      const extra1 = parts[3];
      const extra2 = parts[4];
      const fullName = `${first} ${last}`.replace(/\s+/g, ' ').trim();
      if (fullName && manager) {
        rows.push({
          fullName,
          expectedManager: manager,
          extraManager1: extra1,
          extraManager2: extra2
        });
      }
    }
  });

  const { data: rawUsers } = await supabase.from('users').select('id, name, email');
  const { data: rawTeams } = await supabase.from('teams').select('manager_id, member_id');

  const dbUsers = (rawUsers || []) as any[];
  const dbTeams = (rawTeams || []) as any[];

  const userMap = new Map<string, any>();
  dbUsers.forEach(u => userMap.set(u.id, u));

  const liveTeamMap = new Map<string, any>();
  dbTeams.forEach(t => {
    const manager = userMap.get(t.manager_id);
    if (manager) {
      liveTeamMap.set(t.member_id, manager);
    }
  });

  function findDbUser(nameStr: string) {
    if (!nameStr) return null;
    const searchLower = nameStr.toLowerCase().replace(/[^a-z]/g, '');
    
    let match = dbUsers.find(u => (u.name || '').toLowerCase() === nameStr.toLowerCase());
    if (match) return match;

    match = dbUsers.find(u => {
      const dbLower = (u.name || '').toLowerCase().replace(/[^a-z]/g, '');
      return dbLower.includes(searchLower) || searchLower.includes(dbLower);
    });
    if (match) return match;

    match = dbUsers.find(u => {
      const emailPrefix = u.email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
      return emailPrefix === searchLower;
    });
    return match || null;
  }

  const matched: string[] = [];
  const mismatched: string[] = [];
  const missingMember: string[] = [];

  rows.forEach(r => {
    const memberUser = findDbUser(r.fullName);
    if (!memberUser) {
      missingMember.push(`👤 "${r.fullName}" expected to report to "${r.expectedManager}"`);
      return;
    }

    const liveManager = liveTeamMap.get(memberUser.id);
    if (!liveManager) {
      mismatched.push(`❌ ${memberUser.name} (${memberUser.email}): Expected manager is "${r.expectedManager}", but has NO manager assigned in the app.`);
      return;
    }

    const liveManagerNameClean = (liveManager.name || '').toLowerCase().replace(/[^a-z]/g, '');
    
    // Check main expected manager
    const expectedClean = r.expectedManager.toLowerCase().replace(/[^a-z]/g, '');
    let isMatch = liveManagerNameClean.includes(expectedClean) || expectedClean.includes(liveManagerNameClean);

    // Also check overrides in Column 4 or 5
    if (!isMatch && r.extraManager1) {
      const cleanExtra1 = r.extraManager1.toLowerCase().replace(/[^a-z]/g, '');
      if (liveManagerNameClean.includes(cleanExtra1) || cleanExtra1.includes(liveManagerNameClean)) {
        isMatch = true;
      }
    }
    if (!isMatch && r.extraManager2) {
      const cleanExtra2 = r.extraManager2.toLowerCase().replace(/[^a-z]/g, '');
      if (liveManagerNameClean.includes(cleanExtra2) || cleanExtra2.includes(liveManagerNameClean)) {
        isMatch = true;
      }
    }

    if (isMatch) {
      matched.push(`✅ ${memberUser.name} (${memberUser.email}) matches! Reports to: ${liveManager.name}`);
    } else {
      let expectedStr = r.expectedManager;
      if (r.extraManager1) expectedStr += ` / ${r.extraManager1}`;
      if (r.extraManager2) expectedStr += ` / ${r.extraManager2}`;
      
      mismatched.push(`❌ ${memberUser.name} (${memberUser.email}): Expected manager is "${expectedStr}", but is assigned to "${liveManager.name}" in the app.`);
    }
  });

  console.log('\n======================================================');
  console.log('📊 REPORTING RELATIONSHIP COMPLIANCE AUDIT V2');
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
