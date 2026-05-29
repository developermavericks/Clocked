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

  let nonEmtpyRowsCount = 0;
  let rowsWithEmailCount = 0;

  sheet.eachRow((row, i) => {
    if (i === 1) return; // Skip headers

    const email = row.getCell(5).text?.trim();
    if (email) {
      rowsWithEmailCount++;
    }

    let hasValue = false;
    row.eachCell((cell) => {
      if (cell.text && cell.text.trim().length > 0) {
        hasValue = true;
      }
    });

    if (hasValue) {
      nonEmtpyRowsCount++;
    }
  });

  console.log(`Excel sheet.rowCount (including blank formatted): ${sheet.rowCount} rows`);
  console.log(`Rows with actual values populated:               ${nonEmtpyRowsCount} rows`);
  console.log(`Rows with a valid employee email:                ${rowsWithEmailCount} rows`);
}

check().catch(console.error);
