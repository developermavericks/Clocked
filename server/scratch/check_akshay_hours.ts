import ExcelJS from 'exceljs';
import path from 'path';

async function checkHours() {
  const filePath = path.join(__dirname, '../../Credentials (2) (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('allocations_weekly');
  if (!sheet) {
    console.error('Worksheet allocations_weekly not found!');
    return;
  }

  let totalHours = 0;
  let matchingRowsCount = 0;
  const matches: any[] = [];

  sheet.eachRow((row, i) => {
    if (i === 1) return; // Skip headers

    const email = row.getCell(5).text.toLowerCase().trim();
    const monthVal = row.getCell(2).value; // YYYY-MM or Date object
    const hours = parseFloat(row.getCell(9).text) || 0;

    // Akshay's email
    if (email === 'akshay@themavericksindia.com') {
      let monthStr = '';
      if (monthVal instanceof Date) {
        monthStr = monthVal.toISOString().slice(0, 7);
      } else {
        monthStr = String(monthVal).slice(0, 7);
      }

      // Check if it is February (ends with -02)
      if (monthStr.endsWith('-02')) {
        totalHours += hours;
        matchingRowsCount++;
        matches.push({
          row: i,
          month: monthStr,
          client: row.getCell(7).text,
          category: row.getCell(8).text,
          hours,
          notes: row.getCell(10).text
        });
      }
    }
  });

  console.log(`--- Akshay's February Hours ---`);
  console.log(`Email: akshay@themavericksindia.com`);
  console.log(`Total February matching rows: ${matchingRowsCount}`);
  console.log(`Total February hours: ${totalHours}`);
  console.log(`Individual logs:`);
  console.log(JSON.stringify(matches, null, 2));
}

checkHours().catch(console.error);
