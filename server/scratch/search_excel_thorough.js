const ExcelJS = require('exceljs');
const path = require('path');

async function search() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, '../../Credentials (2) (1).xlsx'));
  
  console.log('Thoroughly searching Excel file...');
  workbook.worksheets.forEach(ws => {
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const val = cell.value;
        if (!val) return;
        const valStr = String(typeof val === 'object' && val.text ? val.text : val);
        const lower = valStr.toLowerCase();
        
        if (lower.includes('111') || lower.includes('target') || lower.includes('account')) {
          // Skip long UUIDs or emails unless they specifically have 111 in a short way
          if (valStr.length > 30 && !valStr.includes('111')) return;
          
          console.log(`[${ws.name}] Cell ${cell.address} (${rowNumber}, ${colNumber}): "${valStr}"`);
          console.log(`  Row values:`, row.values.slice(1, 12));
        }
      });
    });
  });
}

search().catch(console.error);
