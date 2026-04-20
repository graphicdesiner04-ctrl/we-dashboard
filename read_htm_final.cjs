// Script: read_htm_final.cjs
// Purpose: Full structured extraction of Q1 and Q2 HTM schedule files
// Structure: TDs are sequential - first N TDs = employee headers, then groups of N+1 TDs per date row
const fs = require('fs');

function extractSchedule(filePath, label) {
  console.log('='.repeat(80));
  console.log(`SCHEDULE EXTRACTION (${label}):`, filePath);
  console.log('='.repeat(80));

  let html;
  try {
    html = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    // try latin1 fallback
    try {
      html = fs.readFileSync(filePath, 'latin1');
    } catch (e2) {
      console.error('ERROR reading file:', e2.message);
      return;
    }
  }

  // Helper: clean cell text
  function cleanText(raw) {
    return raw
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (m, code) => String.fromCharCode(parseInt(code)))
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract ALL td raw HTML contents
  const allTds = [];
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = tdRegex.exec(html)) !== null) {
    allTds.push(cleanText(m[1]));
  }

  console.log('Total TDs extracted:', allTds.length);

  // Find the header row: TDs up to (but not including) the first date TD
  // Date TDs look like "Sun 05-04-2026" or "Mon 06-04-2026" etc.
  const datePattern = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+\d{2}-\d{2}-\d{4}$/;

  let firstDateIdx = -1;
  for (let i = 0; i < allTds.length; i++) {
    if (datePattern.test(allTds[i])) {
      firstDateIdx = i;
      break;
    }
  }

  console.log('First date TD found at index:', firstDateIdx);

  if (firstDateIdx === -1) {
    console.log('WARNING: No date pattern found. Showing all TDs:');
    allTds.forEach((td, i) => console.log(`  TD[${i}]: "${td}"`));
    return;
  }

  // Header TDs: indices 0 to firstDateIdx - 1
  const headerTds = allTds.slice(0, firstDateIdx);
  console.log('\nTotal header columns (employees + Date):', headerTds.length);
  console.log('\n--- HEADER ROW ---');
  headerTds.forEach((td, i) => {
    // Parse employee code and name
    const empMatch = td.match(/^(\d+)\s+(.+)$/);
    if (empMatch) {
      console.log(`  Col ${i}: Code=${empMatch[1]} | Name="${empMatch[2]}"`);
    } else {
      console.log(`  Col ${i}: "${td}"`);
    }
  });

  // Now parse data rows: each row has headerTds.length TDs
  // But the Date column is in position 0 of each row
  const numCols = headerTds.length; // includes "Date" column
  const dataTds = allTds.slice(firstDateIdx);

  console.log('\nRemaining TDs after header:', dataTds.length);
  console.log('Expected TDs per row:', numCols);

  // Group data TDs into rows
  const dataRows = [];
  for (let i = 0; i < dataTds.length; i += numCols) {
    const row = dataTds.slice(i, i + numCols);
    if (row.length > 0 && datePattern.test(row[0])) {
      dataRows.push(row);
    } else if (row.length > 0) {
      // Might be a partial row or non-date row
      // Only add if first cell looks date-like at all
      dataRows.push(row); // include anyway for counting
    }
  }

  // Find only rows where first cell is a date
  const dateRows = dataRows.filter(row => datePattern.test(row[0]));
  console.log('\nTotal date rows found:', dateRows.length);

  // Find date range
  if (dateRows.length > 0) {
    console.log('First date:', dateRows[0][0]);
    console.log('Last date:', dateRows[dateRows.length - 1][0]);
  }

  // Show first 3 date rows fully
  console.log('\n--- FIRST 3 DATE ROWS (FULL CONTENT) ---');
  dateRows.slice(0, 3).forEach((row, ri) => {
    console.log(`\nDate Row ${ri + 1}: ${row[0]}`);
    row.slice(1).forEach((cell, ci) => {
      const empName = headerTds[ci + 1] || `Col${ci+1}`;
      const empCode = empName.match(/^(\d+)/)?.[1] || '';
      console.log(`  [${empCode || empName}]: "${cell}"`);
    });
  });

  // Count unique shift types
  const shiftTypes = {};
  dateRows.forEach(row => {
    row.slice(1).forEach(cell => {
      // Normalize: extract shift location (before "From:")
      const loc = cell.split('From:')[0].trim() || cell;
      shiftTypes[loc] = (shiftTypes[loc] || 0) + 1;
    });
  });

  console.log('\n--- UNIQUE SHIFT TYPES / LOCATIONS ---');
  Object.keys(shiftTypes).sort().forEach(k => {
    console.log(`  "${k}": ${shiftTypes[k]} times`);
  });

  // Count total non-Off entries
  let offCount = 0, workCount = 0, totalEntries = 0;
  dateRows.forEach(row => {
    row.slice(1).forEach(cell => {
      totalEntries++;
      if (cell.toLowerCase().startsWith('off') || cell === '') {
        offCount++;
      } else {
        workCount++;
      }
    });
  });

  console.log('\n--- ENTRY COUNTS ---');
  console.log('Total entries (date rows x employee cols):', totalEntries);
  console.log('Off/Empty entries:', offCount);
  console.log('Work shift entries:', workCount);

  // List ALL dates
  console.log('\n--- ALL DATES IN SCHEDULE ---');
  dateRows.forEach((row, i) => {
    console.log(`  ${i + 1}: ${row[0]}`);
  });

  // Employee list with codes
  console.log('\n--- EMPLOYEE LIST (with codes) ---');
  headerTds.slice(1).forEach((td, i) => {
    const empMatch = td.match(/^(\d+)\s+(.+)$/);
    if (empMatch) {
      console.log(`  ${i + 1}. Code: ${empMatch[1]} | Name: ${empMatch[2]}`);
    } else {
      console.log(`  ${i + 1}. "${td}"`);
    }
  });

  return { headerTds, dateRows };
}

// Run both files
console.log('\n');
const q1 = extractSchedule('C:/Users/hp/Downloads/North Menia Q 1 Schedule.htm', 'Q1');

console.log('\n\n');
const q2 = extractSchedule('C:/Users/hp/Downloads/North Menia Q2 Schedule.htm', 'Q2');
