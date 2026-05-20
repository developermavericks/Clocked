const ExcelJS = require('exceljs');
const path = require('path');

async function countRows() {
  const filePath = path.join(__dirname, '../../Credentials (2) (1).xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log(`\n==============================================`);
  console.log(`  CREDENTIALS SPREADSHEET ROW COUNT`);
  console.log(`==============================================`);

  let totalRowsAcrossAllSheets = 0;

  workbook.eachSheet((sheet) => {
    const rowCount = sheet.rowCount;
    totalRowsAcrossAllSheets += rowCount;
    console.log(`Sheet Name:  ${sheet.name.padEnd(20)} | Rows: ${rowCount}`);
  });

  console.log(`----------------------------------------------`);
  console.log(`Total Rows (Lines) Across All Sheets: ${totalRowsAcrossAllSheets}`);
  console.log(`==============================================\n`);
}

countRows().catch(console.error);
