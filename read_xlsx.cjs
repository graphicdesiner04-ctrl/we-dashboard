// Script: read_xlsx.cjs
// Purpose: Read and extract all data from North Menia OU Data.xlsx
const XLSX = require('./node_modules/xlsx');
const path = require('path');

const filePath = 'C:/Users/hp/Downloads/North   Menia OU Data.xlsx';

console.log('='.repeat(80));
console.log('READING XLSX FILE:', filePath);
console.log('='.repeat(80));

let workbook;
try {
  workbook = XLSX.readFile(filePath);
} catch (e) {
  console.error('ERROR reading file:', e.message);
  process.exit(1);
}

const sheetNames = workbook.SheetNames;
console.log('\nTOTAL SHEETS:', sheetNames.length);
console.log('SHEET NAMES:', sheetNames);
console.log('');

sheetNames.forEach((sheetName, idx) => {
  console.log('='.repeat(80));
  console.log(`SHEET ${idx + 1}: "${sheetName}"`);
  console.log('='.repeat(80));

  const sheet = workbook.Sheets[sheetName];
  const range = sheet['!ref'];
  console.log('Cell Range:', range);

  // Get data as array of arrays (raw)
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log('Total Rows (including header):', rawData.length);

  if (rawData.length === 0) {
    console.log('(Sheet is empty)');
    return;
  }

  // Print header row
  const header = rawData[0];
  console.log('\nCOLUMNS (' + header.length + ' total):');
  header.forEach((col, i) => {
    console.log(`  Col ${i + 1}: "${col}"`);
  });

  // Print all data rows
  console.log('\nALL DATA ROWS:');
  console.log('-'.repeat(80));

  // Also collect as JSON for easier reading
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log('Total Data Rows (excluding header):', jsonData.length);
  console.log('');

  jsonData.forEach((row, i) => {
    console.log(`Row ${i + 1}:`, JSON.stringify(row, null, 0));
  });

  // Also print as CSV-style with all columns
  console.log('\n--- RAW ARRAY FORMAT ---');
  rawData.forEach((row, i) => {
    if (i === 0) {
      console.log('HEADER:', row.map((v, idx) => `[${idx}]${v}`).join(' | '));
    } else {
      console.log(`Row ${i}:`, row.join(' | '));
    }
  });

  console.log('');
});

console.log('='.repeat(80));
console.log('XLSX EXTRACTION COMPLETE');
console.log('='.repeat(80));
