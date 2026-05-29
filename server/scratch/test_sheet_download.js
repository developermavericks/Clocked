const https = require('https');
const fs = require('fs');
const path = require('path');

const spreadsheetId = '1bsDfER0b3z3Quw3tfHsDAx2NqrtbTwPfwrHDLtmgZ5I';
const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
const outputPath = path.join(__dirname, 'downloaded_sheet.xlsx');

console.log('Downloading spreadsheet from:', url);

const file = fs.createWriteStream(outputPath);
https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: Status Code ${response.statusCode}`);
    response.resume();
    return;
  }
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download completed. Size:', fs.statSync(outputPath).size, 'bytes');
  });
}).on('error', (err) => {
  console.error('Error downloading:', err.message);
});
