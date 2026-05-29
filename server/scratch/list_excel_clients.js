const ExcelJS = require('exceljs');
const path = require('path');

async function search() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, '../../Credentials (2) (1).xlsx'));
  
  const ws = workbook.getWorksheet('allocations_weekly');
  const clientsSet = new Set();
  
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const clientVal = row.getCell(7).value; // client column is 7
    if (clientVal) {
      clientsSet.add(String(clientVal).trim());
    }
  });

  const allClients = Array.from(clientsSet).sort();
  console.log('Total unique clients in Excel allocations_weekly:', allClients.length);
  
  const matches = allClients.filter(c => c.includes('111') || c.toLowerCase().includes('target'));
  console.log('Matching clients in Excel:', matches);
}

search().catch(console.error);
