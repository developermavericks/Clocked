require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const CLIENT_CORES = {
  "Adda Education": "Archana",
  "CapitaLand": "Archana",
  "Chargezone (TECSO)": "Archana",
  "College Vidya": "Archana",
  "Goldi Solar": "Archana",
  "GradRight": "Archana",
  "iCreate": "Archana",
  "Merrakki": "Archana",
  "Murf AI": "Archana",
  "Musashi": "Archana",
  "Musashi-D": "Archana",
  "Omnicom Global Solutions": "Archana",
  "Pearl Academy": "Archana",
  "Plaksha": "Archana",

  "Angara": "Mitali",
  "Bambrew": "Mitali",
  "Chupps": "Mitali",
  "Clinikally": "Mitali",
  "Eruditus": "Mitali",
  "FUJIFILM": "Mitali",
  "GNFZ": "Mitali",
  "Google": "Mitali",
  "Inc.5": "Mitali",
  "Innover": "Mitali",
  "JCI": "Mitali",
  "JoshTalks": "Mitali",
  "Milliken": "Mitali",
  "Modi Illva": "Mitali",
  "NEC": "Mitali",
  "Noise": "Mitali",
  "Nuuk": "Mitali",
  "People Matters": "Mitali",
  "QUBO (HEPL)": "Mitali",
  "Truworth": "Mitali",
  "Vivo": "Mitali",
  "Wadhwani": "Mitali",

  "Aptiv": "Smriti",
  "Astra Security": "Smriti",
  "AVPN": "Smriti",
  "AxiTrust": "Smriti",
  "BCG": "Smriti",
  "BD - Bright Money": "Smriti",
  "Decentro": "Smriti",
  "FACE": "Smriti",
  "Hasbro": "Smriti",
  "MFF": "Smriti",
  "mPokket": "Smriti",
  "MSDF": "Smriti",
  "Oister": "Smriti",
  "Paasa": "Smriti",
  "PayGlocal": "Smriti",
  "Pixxel": "Smriti",
  "Plum": "Smriti",
  "PYT": "Smriti",
  "Razorpay": "Smriti",
  "Room to Read": "Smriti",
  "SCALE": "Smriti",
  "Scapia": "Smriti",
  "Sense AI": "Smriti",
  "Shubhanshu": "Smriti",
  "Straive": "Smriti",
  "TrueFan AI": "Smriti",
  "Udaiti": "Smriti",
  "Udhyam": "Smriti",
  "Zeno": "Smriti",

  "Capital League": "Chetan",
  "Crazzy Bosses": "Chetan",
  "Optiemus Infracom": "Chetan",
  "PMI": "Chetan",

  "BD": "",
  "BD - AECOM": "",
  "BD - Astrotalk": "",
  "BD - Boston Scientific": "",
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
  "BD - Zeti": "",
  "BD - Zeta": "",
  "BD - Eume": "",
  "FREE_TIME": "",
  "Internal - CS": "",
  "Internal Creative": "",
  "Internal Finance": "",
  "Internal HR": "",
  "Internal Marketing": "",
  "Internal Tech": "",
  "Internal Training": "",
  "LEAVE": "",
  "Personal Commitments": "",
  "BD - BD": "",
  "BD - Innovist": ""
};

async function run() {
  console.log("Checking DB clients against CLIENT_CORES...");
  const { data: dbClients, error } = await supabase.from('clients').select('name, core');
  if (error) {
    console.error(error);
    return;
  }

  const existingKeys = new Set(Object.keys(CLIENT_CORES).map(k => k.toLowerCase()));

  dbClients.forEach(c => {
    if (!existingKeys.has(c.name.toLowerCase())) {
      console.log(`Missing in CLIENT_CORES: "${c.name}" (DB Core: "${c.core || ''}")`);
    }
  });
}

run();
