const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, '../../Credentials (2) (1).xlsx'));
  
  const ws = workbook.getWorksheet('salaries');
  console.log('salaries sheet row count:', ws.rowCount);
  ws.eachRow((row, rowNumber) => {
    console.log(`Row ${rowNumber}:`, row.values.slice(1));
  });
}

check().catch(console.error);
