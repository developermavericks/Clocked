const ExcelJS = require('exceljs');
const path = require('path');

async function search() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, '../../Credentials (2) (1).xlsx'));
  
  console.log('Precise searching Excel worksheets...');
  
  workbook.worksheets.forEach(ws => {
    ws.eachRow((row, rowNumber) => {
      // Check if client name is "111" or contains "111"
      row.eachCell((cell, colNumber) => {
        const valStr = String(cell.value || '').trim();
        const lowerVal = valStr.toLowerCase();
        
        // Exact matches or specific patterns
        if (valStr === '111' || lowerVal === 'target accounts' || lowerVal.includes('target account')) {
          console.log(`EXACT Match in sheet [${ws.name}] at ${cell.address}: "${cell.value}"`);
          console.log(`  Row ${rowNumber} values:`, row.values.slice(1));
        }
      });
    });
  });
}

search().catch(console.error);
