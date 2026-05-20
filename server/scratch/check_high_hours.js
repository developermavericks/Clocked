const ExcelJS = require('exceljs');
const path = require('path');

async function findHighHours() {
  const filePath = path.join(__dirname, '../../Credentials (2) (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('allocations_weekly');
  if (!sheet) {
    console.error('Worksheet allocations_weekly not found!');
    return;
  }

  const aggregates = {};

  sheet.eachRow((row, i) => {
    if (i === 1) return; // Skip headers

    const email = row.getCell(5).text.toLowerCase().trim();
    const monthVal = row.getCell(2).value; // YYYY-MM or Date object
    const hours = parseFloat(row.getCell(9).text) || 0;

    if (!email) return;

    let monthStr = '';
    if (monthVal instanceof Date) {
      monthStr = monthVal.toISOString().slice(0, 7);
    } else {
      monthStr = String(monthVal).slice(0, 7);
    }

    const key = `${email}_${monthStr}`;
    if (!aggregates[key]) {
      aggregates[key] = {
        email,
        month: monthStr,
        hours: 0,
        entriesCount: 0
      };
    }

    aggregates[key].hours += hours;
    aggregates[key].entriesCount++;
  });

  const sortedRecords = Object.values(aggregates)
    .sort((a, b) => b.hours - a.hours);

  console.log(`\n==============================================`);
  console.log(`  TOP 5 HIGHEST MONTHLY LOGGED HOURS IN EXCEL`);
  console.log(`==============================================`);
  sortedRecords.slice(0, 5).forEach((record, index) => {
    console.log(`${index + 1}. Email:        ${record.email}`);
    console.log(`   Month:        ${record.month}`);
    console.log(`   Total Hours:  ${record.hours.toFixed(2)} hours`);
    console.log(`   Total Logs:   ${record.entriesCount} entries`);
    console.log(`----------------------------------------------`);
  });
  console.log(`==============================================\n`);
}

findHighHours().catch(console.error);
