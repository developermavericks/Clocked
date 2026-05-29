const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
  const filePath = path.join(__dirname, '../../Credentials (2) (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('allocations_weekly');
  if (!sheet) {
    console.error('Worksheet allocations_weekly not found!');
    return;
  }

  console.log('Total rows in allocations_weekly sheet:', sheet.rowCount);

  // Collect some rows and sort by date or created_at
  const rows = [];
  sheet.eachRow((row, i) => {
    if (i === 1) return;
    const created_at = row.getCell(11).text || '';
    const email = row.getCell(5).text || '';
    const start_date = row.getCell(13).value;
    const end_date = row.getCell(14).value;
    const hours = row.getCell(9).text || '';
    const client = row.getCell(7).text || '';
    const notes = row.getCell(10).text || '';

    if (email) {
      rows.push({
        rowNumber: i,
        email,
        created_at,
        start_date: start_date instanceof Date ? start_date.toISOString().split('T')[0] : String(start_date || ''),
        end_date: end_date instanceof Date ? end_date.toISOString().split('T')[0] : String(end_date || ''),
        hours,
        client,
        notes
      });
    }
  });

  // Sort by created_at descending or start_date descending
  rows.sort((a, b) => {
    // If created_at exists, sort by it
    if (a.created_at && b.created_at) {
      return b.created_at.localeCompare(a.created_at);
    }
    return b.rowNumber - a.rowNumber;
  });

  console.log('\nTop 20 most recent rows in Excel sheet (sorted by created_at or row number):');
  rows.slice(0, 20).forEach(r => {
    console.log(`- Row: ${r.rowNumber}, Created: ${r.created_at}, User: ${r.email}, Client: ${r.client}, Start: ${r.start_date}, End: ${r.end_date}, Hours: ${r.hours}, Notes: "${r.notes}"`);
  });
}

check().catch(console.error);
