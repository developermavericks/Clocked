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

const arrowList = `
Aayushi Akhouri → Ila
Jyoshitha Unkili → Nikita Hooper
Rajvi Bhansali → Mitali Darbari
Nikita Hooper → Mitali Darbari
Reshita Midya → Srishtee
Aditya Kumar Mehta → Chetan
Mahek Chacha → Shrestha
Ridhi Pandita → Muskaan Bhatia
Sanya Maini → Ishmeet
Shreshtha Chaturvedi → Mahek Pandey
Nikita Chaurasia → Akshay
Disha Kalra → Kavita
Udbhav Singh → Anil
Joyeta Debnath → Akshay
J Surya Narayana → Ishmeet
Mohamed Hisham → Kavita
Apurva → Pavithra
Abhilasha Sharma → Shrestha
Srishti Chanda → Manaswi
Anoushka Aristotle → Akshay
Ananya Gulati → Srishtee
Shinjini Roy → Anil
Neha Pasupuleti → Muskaan Bhatia
Vishakha Bauddh → Samrat
Ritika Goel → Gaurav
Bhavya Joshi → Muskaan Bhatia
Ishmeet Singh Bedi → Akshay
Ariba Neyaz → Samrat
Muskaan Harjai → Aashna
Vibhu Varshney → Samrat
Muskaan Bhardwaj → Mahek Pandey
Riya Rupani → Archana
Sneh S Jain → Akshay
Kashish Ahuja → Vibhuti
Manaswi → Mitali Darbari
Kavita Singh → Vibhuti
Avarna Adukia → Alisha
Grishma Uchil → Srishtee
Manvi Singh → Ila
Pooja Rana → Chetan
Varun Pawar → Mahek Pandey
Tonmoyee Kashyap → Shrestha
Rishika Bujurke → Shrestha
Laveena Giamalani → Rajvi
Gaurav Tuli → Chetan
Akshay Brave → Archana
Ila Upadhyaya → Smriti
Aashna Sharma → Chetan
Sushant Pal → Ananya
Anil Kapoor → Gaurav
Snigdha Sharma → Muskaan Bhatia
Avinash Verma → Chetan
Rohan Jolly → Akshay
Shrestha Banerjee → Smriti
Harshita Mathur → Chhavi
Drishti Checker → Anil
Ritik Pandey → Ila
Sanya Prasad → Pavithra
Alisha Bhasin → Smriti
Ananya Agrawal → Anil
Priyadarshini Singh → Pavithra
Smriti Raghunandan → Chetan
Triyanshi Parihar → Archana
Mansi Ganda → Shrestha
Archana Thomas → Chetan
Mitali Darbari Prakash → Chetan
Mahek Pandey → Archana
Jayeeta Chowdhury → Archana
Pavithra Ramesh → Smriti
Srishtee Sharma → Mitali Darbari
Chhavi Arora → Smriti
Aditya Sharma → Gaurav
Brinda Sridhar → Smriti
Kyle Mendonca → Samrat
Vibhuti Tandon → Mitali Darbari
Shivani Singh → Avinash
Samrat Nath → Gaurav
Muskaan Bhatia → Mitali Darbari
Khushi Batra → Smriti
Vanshika Srivastava → Archana
Udita Singhal → Srishtee
Harprateek → Vibhuti
Reshita Midya → Muskaan Bhardwaj
Nidhi Kaushal → Priya
Divyant Goel → Kavita
Deepthyy Radhakrishnan → Pavithra
Raayan Ukil → Kavita
Nina Tresa Alex → Anoushka Aristotle
Pranay Ghadigaonkar → Anil
Ansh Maheshwari → Anil
Sameera Thakur → Chhavi
Hetavi Shah → Ishmeet
Nidhi Agrawal → Srishti Chanda
Renita Philomena → Ila
Ishita Awasthi → Snigdha
Divyansh Sharma → Chetan
Satyam Kumar → Chetan
Arun Kumar → Chetan
`;

async function migrate() {
  console.log('🚀 Initiating master reporting structure alignment...');

  // 1. Fetch current users to map correctly
  const { data: dbUsers, error: uErr } = await supabase.from('users').select('*');
  if (uErr) {
    console.error('Error fetching users:', uErr);
    return;
  }

  const users = dbUsers || [];
  
  // Maps to search by name/email
  const emailMap = new Map(users.map(u => [u.email.toLowerCase().trim(), u.id]));
  const nameMap = new Map(users.map(u => [(u.name || '').toLowerCase().trim(), u.id]));

  // Helper to resolve or create a user dynamically!
  async function resolveOrCreateUser(name: string): Promise<string> {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const nameLower = cleanName.toLowerCase();

    // Check by exact name match first
    if (nameMap.has(nameLower)) {
      return nameMap.get(nameLower)!;
    }

    // Try fuzzy match
    const foundUser = users.find(u => {
      const dbLower = (u.name || '').toLowerCase().trim();
      return dbLower.includes(nameLower) || nameLower.includes(dbLower);
    });

    if (foundUser) {
      return foundUser.id;
    }

    // Determine default email
    const prefix = cleanName.toLowerCase().replace(/[^a-z]/g, '.');
    const defaultEmail = `${prefix}@themavericksindia.com`;

    if (emailMap.has(defaultEmail)) {
      return emailMap.get(defaultEmail)!;
    }

    // Create the user record if they do not exist
    console.log(`👤 User "${cleanName}" not found in database registry. Creating automatically with email: ${defaultEmail}...`);
    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert([{
        name: cleanName,
        email: defaultEmail,
        role: 'team'
      }])
      .select();

    if (insertErr || !inserted || inserted.length === 0) {
      throw new Error(`Failed to create missing user ${cleanName}: ${JSON.stringify(insertErr)}`);
    }

    const newUserId = inserted[0].id;
    // Cache inside maps to avoid duplicates during single-run creation
    nameMap.set(nameLower, newUserId);
    emailMap.set(defaultEmail, newUserId);
    return newUserId;
  }

  // 2. Parse relationship rows
  const parsedRelationships: { memberName: string; managerName: string }[] = [];
  arrowList.split('\n').forEach(line => {
    const parts = line.split('→').map(p => p.trim());
    if (parts.length >= 2) {
      const memberName = parts[0];
      const managerName = parts[1];
      if (memberName && managerName) {
        parsedRelationships.push({ memberName, managerName });
      }
    }
  });

  console.log(`Parsed ${parsedRelationships.length} relationships to create/verify.`);

  // 3. Clear existing teams table completely to ensure a perfectly clean, standardized alignment!
  console.log('\n🧹 Clearing current teams assignments from database to align fresh...');
  const { error: clearErr } = await supabase.from('teams').delete().neq('manager_id', '00000000-0000-0000-0000-000000000000');
  if (clearErr) {
    console.error('Error clearing teams table:', clearErr);
    return;
  }

  // 4. Map and Insert relationships one-by-one safely
  const teamsToInsert: { manager_id: string; member_id: string }[] = [];
  
  for (const rel of parsedRelationships) {
    try {
      // Resolve member and manager IDs
      const memberId = await resolveOrCreateUser(rel.memberName);
      const managerId = await resolveOrCreateUser(rel.managerName);

      // Prevent self-reporting
      if (memberId === managerId) {
        console.warn(`⚠️ Warning: skipped self-reporting row for ${rel.memberName}.`);
        continue;
      }

      teamsToInsert.push({ manager_id: managerId, member_id: memberId });
    } catch (err: any) {
      console.error(`❌ Skipped relationship "${rel.memberName} → ${rel.managerName}":`, err.message);
    }
  }

  // 5. Bulk insert relationships in batches of 100
  console.log(`\n📥 Inserting ${teamsToInsert.length} reporting relationships into teams table...`);
  const batchSize = 100;
  for (let i = 0; i < teamsToInsert.length; i += batchSize) {
    const batch = teamsToInsert.slice(i, i + batchSize);
    const { error: insertErr } = await supabase.from('teams').insert(batch);
    if (insertErr) {
      console.error(`Error inserting batch at ${i}:`, insertErr);
      return;
    }
  }

  console.log('\n======================================================');
  console.log('🎉 REPORTING HIERARCHY ALIGNMENT COMPLETED SUCCESSFULLY!');
  console.log(`- Database Teams Assigned: ${teamsToInsert.length}`);
  console.log('- When managers log in, they will only see their direct members!');
  console.log('======================================================\n');
}

migrate();
