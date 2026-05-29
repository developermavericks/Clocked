const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
  const filePath = path.join(__dirname, '../../Credentials (1)_updated.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('allocations_weekly');
  if (!sheet) {
    console.error('Worksheet allocations_weekly not found!');
    return;
  }

  console.log('Total sheet rowCount:', sheet.rowCount);

  // Let's scan all rows to find where rows start to have data again or let's print from row 24580 to 25600
  const rows = [];
  sheet.eachRow((row, i) => {
    const email = row.getCell(5).text?.trim();
    if (email) {
      rows.push({
        rowNumber: i,
        email,
        created_at: row.getCell(11).text || '',
        start_date: row.getCell(13).text || '',
        client: row.getCell(7).text || '',
        hours: row.getCell(9).text || '',
        notes: row.getCell(10).text || ''
      });
    }
  });

  console.log(`Total rows with email in Excel: ${rows.length}`);
  
  // Let's print rows around index 24580 in the rows array
  console.log('\n--- Rows around 24580 in the rows array ---');
  rows.slice(24570, 24600).forEach((r, idx) => {
    console.log(`Index in array: ${24570 + idx}, Sheet Row: ${r.rowNumber}, Created: ${r.created_at}, User: ${r.email}, Client: ${r.client}, Start: ${r.start_date}, Hours: ${r.hours}, Notes: "${r.notes}"`);
  });

  console.log('\n--- Last 20 rows in the rows array ---');
  rows.slice(-20).forEach((r, idx) => {
    console.log(`Index in array: ${rows.length - 20 + idx}, Sheet Row: ${r.rowNumber}, Created: ${r.created_at}, User: ${r.email}, Client: ${r.client}, Start: ${r.start_date}, Hours: ${r.hours}, Notes: "${r.notes}"`);
  });
}

check().catch(console.error);
