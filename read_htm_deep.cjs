// Script: read_htm_deep.cjs
// Purpose: Deep analysis of the HTM file structure - handles non-standard table nesting
const fs = require('fs');

function analyzeFile(filePath, label) {
  console.log('='.repeat(80));
  console.log(`DEEP ANALYSIS (${label}):`, filePath);
  console.log('='.repeat(80));

  let html;
  try {
    html = fs.readFileSync(filePath, 'latin1');
  } catch (e) {
    console.error('ERROR reading file:', e.message);
    return;
  }

  console.log('File size:', html.length, 'bytes');

  // Show first 3000 chars of raw HTML to understand structure
  console.log('\n--- FIRST 3000 CHARS OF RAW HTML ---');
  console.log(html.substring(0, 3000));

  console.log('\n--- CHARS 3000-6000 ---');
  console.log(html.substring(3000, 6000));

  // Count all tags
  const tags = {};
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/gi;
  let m;
  while ((m = tagRegex.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    tags[tag] = (tags[tag] || 0) + 1;
  }
  console.log('\n--- TAG COUNT SUMMARY ---');
  Object.keys(tags).sort().forEach(k => {
    if (tags[k] > 0) console.log(`  <${k}>: ${tags[k]}`);
  });

  // Extract ALL td content (not just from nested TRs)
  // The file likely has one big TR with many TDs representing the header column
  // and then date rows structured differently
  const allTdContents = [];
  const tdFull = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let tdm;
  while ((tdm = tdFull.exec(html)) !== null) {
    const rawContent = tdm[1];
    const text = rawContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    allTdContents.push(text);
  }

  console.log('\n--- TOTAL TDs EXTRACTED:', allTdContents.length, '---');
  console.log('\n--- FIRST 60 TD CONTENTS ---');
  allTdContents.slice(0, 60).forEach((td, i) => {
    console.log(`  TD[${i}]: "${td}"`);
  });

  // Look at HTML around the 3rd and 4th TD to understand structure
  console.log('\n--- FINDING STRUCTURE: Looking for date patterns ---');

  // Try to find rows that start with dates (1/1/2026, etc.)
  // The file might use <br> tags to separate rows within a cell
  const brRowMatch = html.match(/<br[^>]*>/gi);
  console.log('Total <br> tags:', brRowMatch ? brRowMatch.length : 0);

  // Check if there are nested tables
  const tableCount = (html.match(/<table/gi) || []).length;
  console.log('Total <table> elements:', tableCount);

  // Look at structure around TD[0] (Date column) to see if dates are listed with <br>
  const dateTdRegex = /<td[^>]*>\s*Date[\s\S]*?<\/td>/gi;
  const dateTdMatch = dateTdRegex.exec(html);
  if (dateTdMatch) {
    console.log('\n--- DATE COLUMN TD (first 3000 chars) ---');
    console.log(dateTdMatch[0].substring(0, 3000));
  }

  // Extract dates from within the Date TD using <p> or <br> tags
  if (dateTdMatch) {
    const dateTdContent = dateTdMatch[0];
    // Find all date-like values
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g;
    const dates = dateTdContent.match(datePattern) || [];
    console.log('\nDates found in Date column:', dates.length);
    console.log('First 10 dates:', dates.slice(0, 10));
    console.log('Last 5 dates:', dates.slice(-5));

    // Also try to find day names or numbers
    const pTags = dateTdContent.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    console.log('\nTotal <p> tags in Date column:', pTags.length);
    pTags.slice(0, 10).forEach((p, i) => {
      const text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`  Date p[${i}]: "${text}"`);
    });
  }

  // Now let's look at the second TD (first employee column)
  if (allTdContents.length > 1) {
    // Find the raw HTML of TD[1]
    let tdCount = 0;
    const tdRawRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let rawMatch;
    while ((rawMatch = tdRawRegex.exec(html)) !== null) {
      tdCount++;
      if (tdCount === 2) {
        console.log('\n--- TD[1] RAW HTML (first 3000 chars) ---');
        console.log(rawMatch[0].substring(0, 3000));

        // Extract all paragraphs from this TD
        const pTags2 = rawMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
        console.log('\nTotal <p> tags in TD[1]:', pTags2.length);
        pTags2.slice(0, 10).forEach((p, i) => {
          const text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          console.log(`  p[${i}]: "${text}"`);
        });
        break;
      }
    }
  }

  // Final: show chars 6000-9000 of HTML
  console.log('\n--- CHARS 6000-9000 (to see data structure) ---');
  console.log(html.substring(6000, 9000));
}

// Analyze Q1
analyzeFile('C:/Users/hp/Downloads/North Menia Q 1 Schedule.htm', 'Q1');
console.log('\n\n');
// Analyze Q2
analyzeFile('C:/Users/hp/Downloads/North Menia Q2 Schedule.htm', 'Q2');
