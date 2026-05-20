const ExcelJS = require('exceljs');
const path = require('path');

async function countActualRows() {
  const filePath = path.join(__dirname, '../../Credentials (2) (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('allocations_weekly');
  if (!sheet) {
    console.error('Worksheet allocations_weekly not found!');
    return;
  }

  let totalRowCount = sheet.rowCount;
  let nonEmtpyRowsCount = 0;
  let rowsWithEmailCount = 0;

  sheet.eachRow((row, i) => {
    if (i === 1) return; // Skip headers

    const email = row.getCell(5).text.trim();
    const hours = row.getCell(9).text.trim();

    // Check if the row has both email and hours
    if (email) {
      rowsWithEmailCount++;
    }

    // Check if the row has any non-empty cell value
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

  console.log(`\n==============================================`);
  console.log(`  ACTUAL DATA ROWS IN ALLOCATIONS_WEEKLY`);
  console.log(`==============================================`);
  console.log(`Excel sheet.rowCount (including blank formatted): ${totalRowCount} rows`);
  console.log(`Rows with actual values populated:               ${nonEmtpyRowsCount} rows`);
  console.log(`Rows with a valid employee email:                ${rowsWithEmailCount} rows`);
  console.log(`==============================================\n`);
}

countActualRows().catch(console.error);
