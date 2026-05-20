require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const clientCores = {
  "BCG": "Smriti",
  "BD": "",
  "BD - AECOM": "",
  "BD - Astrotalk": "",
  "BD - Boston Scientific": "",
  "BD - Bright Money": "Smriti",
  "BD - Capitalmind": "",
  "BD - Caterpillar": "",
  "BD - Chalet": "",
  "BD - Chorus": "",
  "BD - CLI": "",
  "BD - Griffith": "",
  "BD - Infinite": "",
  "BD - iTel": "",
  "BD - IVCA": "",
  "BD - JAR": "",
  "BD - Mahavir": "",
  "BD - Mitsbushi": "",
  "BD - Panasonic": "",
  "BD - Peak XV": "",
  "BD - Qualcomm": "",
  "BD - Shadowfax": "",
  "BD - Shiprocket": "",
  "BD - Simple Energy": "",
  "BD - UPgrad": "",
  "BD - WGT": "",
  "BD - YouTube": "",
  "BD - Zeta": "",
  "BD - Zeti": "",
  "BD- Eume": "",
  "Capital League": "Chetan",
  "CapitaLand": "Archana",
  "Chargezone (TECSO)": "Archana",
  "Chupps": "Mitali",
  "Clinikally": "Mitali",
  "College Vidya": "Archana",
  "Crazzy Bosses": "Chetan",
  "Decentro": "Smriti",
  "Eruditus": "Mitali",
  "FACE": "Smriti",
  "FREE_TIME": "",
  "FUJIFILM": "Mitali",
  "GNFZ": "Mitali",
  "Goldi Solar": "Archana",
  "Google": "Mitali",
  "GradRight": "Archana",
  "Hasbro": "Smriti",
  "Haystack": "Mitali",
  "iCreate": "Archana",
  "Inc.5": "Mitali",
  "Innover": "Mitali",
  "Internal - CS": "",
  "Internal Creative": "",
  "Internal Finance": "",
  "Internal HR": "",
  "Internal Marketing": "",
  "Internal Tech": "",
  "Internal Training": "",
  "JCI": "Mitali",
  "JoshTalks": "Mitali",
  "LEAVE": "",
  "Merrakki": "Archana",
  "MFF": "Smriti",
  "Milliken": "Mitali",
  "Modi Illva": "Mitali",
  "mPokket": "Smriti",
  "MSDF": "Smriti",
  "Murf AI": "Archana",
  "Musashi": "Archana",
  "Musashi-D": "Archana",
  "NEC": "Mitali",
  "Noise": "Mitali",
  "Nuuk": "Mitali",
  "Oister": "Smriti",
  "Omnicom Global Solutions": "Archana",
  "Optiemus Infracom": "Chetan",
  "Paasa": "Smriti",
  "PayGlocal": "Smriti",
  "Pearl Academy": "Archana",
  "People Matters": "Mitali",
  "Personal Commitments": "",
  "Pixxel": "Smriti",
  "Plaksha": "Archana",
  "Plum": "Smriti",
  "PMI": "Chetan",
  "PYT": "Smriti",
  "QUBO (HEPL)": "Mitali",
  "Razorpay": "Smriti",
  "Room to Read": "Smriti",
  "SCALE": "Smriti",
  "Scapia": "Smriti",
  "Sense AI": "Smriti",
  "Shubhanshu": "Smriti",
  "Straive": "Smriti",
  "TrueFan AI": "Smriti",
  "Truworth": "Mitali",
  "Udaiti": "Smriti",
  "Udhyam": "Smriti",
  "Vivo": "Mitali",
  "Wadhwani": "Mitali",
  "Zeno": "Smriti",
  "BD - BD": "",
  "BD - Innovist": ""
};

async function updateCores() {
  console.log('Fetching existing clients...');
  const { data: clients, error: fetchErr } = await supabase
    .from('clients')
    .select('id, name, core');

  if (fetchErr) {
    console.error('Error fetching clients:', fetchErr);
    return;
  }

  let updatedCount = 0;
  let missingFromDb = [];
  
  // Track which clients in the DB got updated
  for (const client of clients) {
    // Exact match or try to match without extra spaces
    const targetCore = clientCores[client.name];
    
    // If it's in our mapping list, update it (whether it is a person or empty)
    if (targetCore !== undefined) {
      if (client.core !== targetCore) {
        const { error: updateErr } = await supabase
          .from('clients')
          .update({ core: targetCore })
          .eq('id', client.id);
          
        if (updateErr) {
          console.error(`Failed to update ${client.name}:`, updateErr);
        } else {
          console.log(`Updated [${client.name}] -> Core: ${targetCore || 'Unassigned'}`);
          updatedCount++;
        }
      }
    } else {
      // If it's in the DB but NOT in the provided list, clear it to unassigned
      if (client.core && client.core !== '') {
        const { error: updateErr } = await supabase
          .from('clients')
          .update({ core: '' })
          .eq('id', client.id);
          
        if (!updateErr) {
          console.log(`Cleared [${client.name}] -> Core: Unassigned (not in provided list)`);
          updatedCount++;
        }
      }
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} client core assignments!`);
}

updateCores();
