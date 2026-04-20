// Script: read_htm_q2.cjs
// Purpose: Analyze North Menia Q2 Schedule HTM file structure
const fs = require('fs');

const filePath = 'C:/Users/hp/Downloads/North Menia Q2 Schedule.htm';

console.log('='.repeat(80));
console.log('READING HTM FILE (Q2):', filePath);
console.log('='.repeat(80));

let html;
try {
  html = fs.readFileSync(filePath, 'latin1');
} catch (e) {
  console.error('ERROR reading file:', e.message);
  process.exit(1);
}

console.log('File size:', html.length, 'bytes');

// Count total TDs and TRs
const tdMatches = html.match(/<td[\s>]/gi) || [];
const trMatches = html.match(/<tr[\s>]/gi) || [];
console.log('\nTotal <TR> elements:', trMatches.length);
console.log('Total <TD> elements:', tdMatches.length);

// Extract all rows with their cells
function extractRows(html) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      const rawCell = tdMatch[1];
      const text = rawCell
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#\d+;/g, (m) => {
          const code = parseInt(m.replace(/&#(\d+);/, '$1'));
          return String.fromCharCode(code);
        })
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(text);
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
}

const rows = extractRows(html);
console.log('\nTotal parsed rows (with cells):', rows.length);

// Analyze column counts per row
const colCounts = {};
rows.forEach(r => {
  const c = r.length;
  colCounts[c] = (colCounts[c] || 0) + 1;
});
console.log('\nColumn count distribution:');
Object.keys(colCounts).sort((a,b) => b-a).forEach(k => {
  console.log(`  ${k} columns: ${colCounts[k]} rows`);
});

// Header rows
console.log('\n--- ROW 1 (Header/Employee Names) ---');
if (rows[0]) {
  console.log('Columns in row 1:', rows[0].length);
  rows[0].forEach((cell, i) => {
    console.log(`  Cell ${i}: "${cell}"`);
  });
}

console.log('\n--- ROW 2 ---');
if (rows[1]) {
  console.log('Columns in row 2:', rows[1].length);
  rows[1].forEach((cell, i) => {
    console.log(`  Cell ${i}: "${cell}"`);
  });
}

console.log('\n--- ROW 3 ---');
if (rows[2]) {
  console.log('Columns in row 3:', rows[2].length);
  rows[2].forEach((cell, i) => {
    console.log(`  Cell ${i}: "${cell}"`);
  });
}

// Show all rows up to row 10
console.log('\n--- ALL FIRST 10 ROWS SUMMARY ---');
rows.slice(0, 10).forEach((row, i) => {
  console.log(`Row ${i + 1} (${row.length} cols): [${row.slice(0, 8).map(c => `"${c}"`).join(', ')}${row.length > 8 ? `, ... (${row.length - 8} more)` : ''}]`);
});

// Find date rows
console.log('\n--- IDENTIFYING DATE ROWS ---');
const dateRows = [];
rows.forEach((row, i) => {
  const firstCells = row.slice(0, 3).join(' ');
  if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2}|^\d{1,2}$/.test(firstCells)) {
    dateRows.push({ rowIndex: i + 1, cells: row });
  }
});
console.log('Found', dateRows.length, 'possible date rows');

console.log('\n--- FIRST 3 DATE ROWS (FULL CONTENT) ---');
dateRows.slice(0, 3).forEach((dr, i) => {
  console.log(`\nDate Row ${i + 1} (row index ${dr.rowIndex}):`);
  dr.cells.forEach((cell, ci) => {
    console.log(`  Col ${ci}: "${cell}"`);
  });
});

// All values in column 0 (first 50)
console.log('\n--- ALL VALUES IN COLUMN 0 (first 50) ---');
rows.slice(0, 50).forEach((row, i) => {
  if (row[0]) console.log(`  Row ${i + 1}: "${row[0]}"`);
});

console.log('\n--- ALL VALUES IN COLUMN 1 (first 50) ---');
rows.slice(0, 50).forEach((row, i) => {
  if (row[1]) console.log(`  Row ${i + 1}: "${row[1]}"`);
});

console.log('\n='.repeat(80));
console.log('Q2 HTM ANALYSIS COMPLETE');
console.log('='.repeat(80));
