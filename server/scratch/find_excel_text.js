const ExcelJS = require('exceljs');
const path = require('path');

async function search() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, '../../Credentials (2) (1).xlsx'));
  
  console.log('Searching sheets...');
  
  workbook.worksheets.forEach(ws => {
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const text = String(cell.value || '').toLowerCase();
        if (text.includes('111') || text.includes('target') || text.includes('suggest') || text.includes('jan')) {
          console.log(`Match in sheet [${ws.name}] at Cell (${rowNumber}, ${colNumber}) [${cell.address}]: "${cell.value}"`);
          // Print surrounding row values
          console.log(`  Row ${rowNumber} values:`, row.values.slice(1));
        }
      });
    });
  });
}

search().catch(console.error);
