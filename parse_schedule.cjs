const fs = require('fs');

const html = fs.readFileSync('C:/Users/hp/Downloads/First Schedule.htm', 'utf8');
const tds  = html.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

function clean(td) {
  return td.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const texts = tds.map(clean);

// ── Employee column → empId map ───────────────────────────────────────────
const COL_EMP = {
  1:  'emp-41',  // 295879
  2:  'emp-20',  // 7703
  3:  'emp-33',  // 239015
  4:  'emp-29',  // 217432
  5:  'emp-12',  // 8287
  6:  'emp-23',  // 8474
  7:  'emp-21',  // 236311
  8:  'emp-36',  // 8141
  9:  'emp-39',  // 355561
  10: 'emp-37',  // 331230
  11: 'emp-34',  // 7849
  12: 'emp-38',  // 251614
  13: 'emp-24',  // 216859
  14: 'emp-28',  // 8256
  15: 'emp-30',  // 9070
  16: 'emp-40',  // 163825
  17: 'emp-19',  // 7702
  18: 'emp-32',  // 9072
  19: 'emp-27',  // 165419
  20: 'emp-31',  // 9071
  21: 'emp-25',  // 277026
  22: 'emp-26',  // 214059
  23: 'emp-18',  // 165124
  24: 'emp-22',  // 121369
  // 25: separator
  26: 'emp-17',  // 6882
  27: 'emp-16',  // 5839
  28: 'emp-15',  // 8142
  29: 'emp-14',  // 7850
  30: 'emp-13',  // 6813
};

// ── Branch name → branchId ────────────────────────────────────────────────
function parseBranch(name) {
  const n = name.toLowerCase();
  if (n.includes('mallawy'))              return 'br-01';
  if (n.includes('dir moaw') || n.includes('der moaw') || n.includes('dir maw') || n.includes('der maw')) return 'br-02';
  if (n.includes('dalga'))                return 'br-03';
  if (n.includes('abo kurkas') || n.includes('abu kurkas')) return 'br-04';
  if (n.includes('el menia el gidida') || n.includes('new menia') || n.includes('menia el gidida')) return 'br-06';
  if (n.includes('menia'))                return 'br-05';
  if (n.includes('bani ahmed') || n.includes('bany ahmed')) return 'br-07';
  if (n.includes('saft'))                 return 'br-08';
  if (n.includes('manshaat'))             return null; // no branch id
  if (n.includes('nasr'))                 return null; // no branch id
  return null;
}

// ── Parse time from cell text ─────────────────────────────────────────────
function parseTime(cellText) {
  const from = cellText.match(/From:\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
  const to   = cellText.match(/To:\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
  function to24(t) {
    if (!t) return undefined;
    const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!m) return undefined;
    let h = parseInt(m[1]);
    const min = m[2];
    const ampm = m[3].toLowerCase();
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${min}`;
  }
  return {
    startTime: to24(from ? from[1] : null),
    endTime:   to24(to   ? to[1]   : null),
  };
}

// ── Parse cell → ScheduleEntry fields ────────────────────────────────────
function parseCell(cellText) {
  const t = cellText.trim();
  if (!t || t === 'Off' || t === 'off')  return { cellType: 'off' };
  if (/^annual/i.test(t))                return { cellType: 'annual' };
  if (/^sick/i.test(t))                  return { cellType: 'sick' };
  if (/^vacation/i.test(t))              return { cellType: 'annual' };

  // Remove "From/To" from branch name
  const namePart = t.replace(/From:.*$/i, '').trim();

  const isVisit = /\(VISITS\)/i.test(namePart);
  const cleanBranch = namePart.replace(/\(VISITS\)/gi, '').trim();

  // Holiday entries like "Mallawy عيد الغطاس" → treat as branch entry with note
  const branchId = parseBranch(cleanBranch);
  const times    = parseTime(t);

  if (isVisit) {
    return {
      cellType: 'visit',
      branchId: branchId || undefined,
      note: cleanBranch,
      ...times,
    };
  }

  if (branchId) {
    return { cellType: 'branch', branchId, ...times };
  }

  // Unknown branch (Nasr City, Manshaat Naser, etc.)
  return { cellType: 'branch', note: cleanBranch, ...times };
}

// ── Parse date string ─────────────────────────────────────────────────────
function parseDate(text) {
  // "Sun 28-12-2025"
  const m = text.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ── Main parse ────────────────────────────────────────────────────────────
const COLS_PER_ROW = 31; // 1 date + 24 agents + 1 separator + 5 seniors
const entries = [];
let seqNum = 1;

// Find all date row start indices
let i = 31; // first date TD
while (i < texts.length) {
  const t = texts[i];
  if (/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+\d{2}-\d{2}-\d{4}/.test(t)) {
    const dateStr = parseDate(t);
    if (!dateStr) { i++; continue; }

    // Process each employee column
    for (let col = 1; col <= 30; col++) {
      if (col === 25) continue; // skip "# Seniors #"
      const empId = COL_EMP[col];
      if (!empId) continue;

      const cellIdx = i + col;
      if (cellIdx >= texts.length) break;
      const cellText = texts[cellIdx];

      const parsed = parseCell(cellText);
      if (parsed.cellType === 'off' || parsed.cellType === 'empty') continue; // skip off days

      const id = `sch-fs-${String(seqNum).padStart(4,'0')}`;
      seqNum++;

      const entry = {
        id,
        employeeId: empId,
        date: dateStr,
        cellType: parsed.cellType,
        note: parsed.note || '',
        createdAt: '2026-04-20T00:00:00.000Z',
      };
      if (parsed.branchId)  entry.branchId  = parsed.branchId;
      if (parsed.startTime) entry.startTime = parsed.startTime;
      if (parsed.endTime)   entry.endTime   = parsed.endTime;
      entries.push(entry);
    }

    i += COLS_PER_ROW;
  } else {
    i++;
  }
}

console.log('Total entries generated:', entries.length);
// Stats by cellType
const byType = {};
entries.forEach(e => { byType[e.cellType] = (byType[e.cellType]||0)+1; });
console.log('By type:', byType);
// Date range
const dates = entries.map(e => e.date).sort();
console.log('Date range:', dates[0], '→', dates[dates.length-1]);

// Write output as TS
let out = '// First Schedule (28-12-2025 → 04-04-2026)\n';
entries.forEach(e => {
  let line = `  {id:'${e.id}',employeeId:'${e.employeeId}',date:'${e.date}',cellType:'${e.cellType}'`;
  if (e.branchId)  line += `,branchId:'${e.branchId}'`;
  if (e.startTime) line += `,startTime:'${e.startTime}'`;
  if (e.endTime)   line += `,endTime:'${e.endTime}'`;
  if (e.note)      line += `,note:'${e.note.replace(/'/g,"\\'")}'`;
  line += `,createdAt:'${e.createdAt}'},`;
  out += line + '\n';
});

fs.writeFileSync('first_schedule_entries.txt', out);
console.log('Written to first_schedule_entries.txt');
