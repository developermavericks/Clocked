const ExcelJS = require('exceljs');
const path = require('path');

async function search() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, '../../Credentials (2) (1).xlsx'));
  
  workbook.worksheets.forEach(ws => {
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const val = cell.value;
        if (val === 111 || String(val) === '111' || String(val).toLowerCase().includes('111')) {
          // Avoid printing if it is just a UUID containing 111
          const str = String(val);
          if (str.length < 20 || str.includes(' ') || str === '111') {
            console.log(`Sheet: ${ws.name}, Cell: ${cell.address}, Value: "${val}"`);
            console.log(`  Row values:`, row.values.slice(1));
          }
        }
      });
    });
  });
}

search().catch(console.error);
