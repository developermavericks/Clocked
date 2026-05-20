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

const LOWERCASE_CLIENT_CORES = {};
Object.entries(CLIENT_CORES).forEach(([name, core]) => {
  LOWERCASE_CLIENT_CORES[name.toLowerCase()] = { originalName: name, core };
});

async function run() {
  console.log("Fetching ALL allocations...");
  
  let allocations = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('hours, clients(name)')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(error);
      break;
    }
    allocations = allocations.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`Total allocations fetched: ${allocations.length}`);

  let totalHours = 0;
  let ignoredHours = 0;
  let ignoredClients = new Map();

  allocations.forEach(r => {
    const clientName = r.clients ? r.clients.name : null;
    const hours = Number(r.hours) || 0;
    totalHours += hours;

    if (!clientName) {
      ignoredHours += hours;
      ignoredClients.set('Unknown Client (NULL)', (ignoredClients.get('Unknown Client (NULL)') || 0) + hours);
      return;
    }

    const match = LOWERCASE_CLIENT_CORES[clientName.trim().toLowerCase()];
    if (!match) {
      ignoredHours += hours;
      ignoredClients.set(clientName, (ignoredClients.get(clientName) || 0) + hours);
    }
  });

  console.log(`Sum of all logged hours across all time: ${totalHours}`);
  console.log(`Sum of ignored hours: ${ignoredHours}`);
  console.log("Ignored clients breakdown across all time (sorted descending by hours):");
  const sorted = Array.from(ignoredClients.entries()).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([name, hr]) => {
    console.log(`- ${name}: ${hr} hours`);
  });
}

run();
