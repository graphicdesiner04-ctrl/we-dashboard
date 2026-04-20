const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('C:/Users/hp/Downloads/Evaluation_Full.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

const EMP_MAP = {
  '355561':'emp-39','9070':'emp-30','331230':'emp-37','214059':'emp-26',
  '236311':'emp-21','7703':'emp-20','163825':'emp-40','239015':'emp-33',
  '165419':'emp-27','7702':'emp-19','7849':'emp-34','277026':'emp-25',
  '9071':'emp-31','8141':'emp-36','8474':'emp-23','8287':'emp-12',
  '217432':'emp-29','8256':'emp-28','9072':'emp-32','121369':'emp-22','165124':'emp-18'
};

const BR_MAP = {
  'abo kurkas':'br-04','dalga':'br-03','der mawas':'br-02',
  'new menia':'br-06','menia':'br-05','mallawy':'br-01',
  'saft elkhamar':'br-08'
};

function parseBranch(b) {
  if (!b || b.trim() === '' || b === '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f' || b === 'Multiple') return undefined;
  const key = b.trim().toLowerCase();
  for (const [k,v] of Object.entries(BR_MAP)) {
    if (key.includes(k)) return v;
  }
  return undefined;
}

function parseDate(d) {
  if (!d) return null;
  const s = String(d).trim();
  const m1 = s.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g);
  if (m1) {
    const last = m1[m1.length-1];
    const parts = last.split(/[\/\-]/);
    if (parts[2].length === 4) return parts[2]+'-'+parts[1]+'-'+parts[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

const records = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[1]) continue;
  const empCode = String(row[1]).trim();
  const empId = EMP_MAP[empCode];
  const score = Number(row[2]);
  const note = (row[4] || '').toString().trim();
  const date = parseDate(row[5]);
  const branchId = parseBranch(row[6]);
  const idx = String(i).padStart(3,'0');
  const rec = {id:'ev-seed-'+idx,employeeId:empId||'??',note,score,date:date||'??',createdAt:'2026-04-19T12:00:00.000Z'};
  if (branchId) rec.branchId = branchId;
  records.push(rec);
}

// Build permission records from score=0 notes mentioning permission
const permRecs = [];
const annualRecs = [];
let pIdx = 2, aIdx = 2;

const permKeywords = ['permission', 'permissin'];
const annualKeywords = ['annual out of schedule', 'annual leave out of schedule'];

for (const r of records) {
  const noteLower = r.note.toLowerCase();
  if (r.score === 0) {
    if (permKeywords.some(k => noteLower.includes(k))) {
      // Parse hours from note
      let hours = 1, minutes = 0;
      const hrMatch = noteLower.match(/(\d+)\s*hour/);
      const minMatch = noteLower.match(/(\d+)\s*min/);
      if (hrMatch) hours = parseInt(hrMatch[1]);
      if (minMatch) { minutes = parseInt(minMatch[1]); hours = 0; }
      const decimalHours = hours + minutes/60;
      const branchId = r.branchId || '';
      permRecs.push({
        id: 'pm-seed-'+String(pIdx).padStart(3,'0'),
        employeeId: r.employeeId,
        branchId,
        date: r.date,
        hours,
        minutes,
        decimalHours: Math.round(decimalHours*100)/100,
        note: r.note,
        createdAt: r.createdAt,
      });
      pIdx++;
    } else if (annualKeywords.some(k => noteLower.includes(k))) {
      // Check if multi-day (e.g., "10&11 march")
      const multiDayMatch = noteLower.match(/(\d+)&(\d+)/);
      const days = multiDayMatch ? 2 : 1;
      const branchId = r.branchId || '';
      annualRecs.push({
        id: 'al-seed-'+String(aIdx).padStart(3,'0'),
        employeeId: r.employeeId,
        branchId,
        date: r.date,
        days,
        note: r.note,
        createdAt: r.createdAt,
      });
      aIdx++;
    }
  }
}

// Generate TypeScript content
let out = '';

// Eval records
out += '// ── Evaluation Seed Records ─────────────────────────────────────────────────\n';
out += '// SOURCE: Evaluation_Full.xlsx — 67 records imported 2026-04-19\n\n';
out += 'EVAL_SEED_RECORDS_START\n';
for (const r of records) {
  const escaped = r.note.replace(/\\/g,'\\\\').replace(/`/g,'\\`');
  let line = '  { id: `'+r.id+'`, employeeId: `'+r.employeeId+'`, score: '+r.score+', date: `'+r.date+'`';
  if (r.branchId) line += ', branchId: `'+r.branchId+'`';
  line += ', note: `'+escaped+'`, createdAt: `'+r.createdAt+'` },';
  out += line + '\n';
}
out += 'EVAL_SEED_RECORDS_END\n\n';

// Permission records
out += 'PERM_SEED_RECORDS_START\n';
for (const r of permRecs) {
  const escaped = r.note.replace(/\\/g,'\\\\').replace(/`/g,'\\`');
  let line = '  { id: `'+r.id+'`, employeeId: `'+r.employeeId+'`, branchId: `'+r.branchId+'`';
  line += ', date: `'+r.date+'`, hours: '+r.hours+', minutes: '+r.minutes+', decimalHours: '+r.decimalHours;
  line += ', note: `'+escaped+'`, createdAt: `'+r.createdAt+'` },';
  out += line + '\n';
}
out += 'PERM_SEED_RECORDS_END\n\n';

// Annual leave records
out += 'ANNUAL_SEED_RECORDS_START\n';
for (const r of annualRecs) {
  const escaped = r.note.replace(/\\/g,'\\\\').replace(/`/g,'\\`');
  let line = '  { id: `'+r.id+'`, employeeId: `'+r.employeeId+'`, branchId: `'+r.branchId+'`';
  line += ', date: `'+r.date+'`, days: '+r.days;
  line += ', note: `'+escaped+'`, createdAt: `'+r.createdAt+'` },';
  out += line + '\n';
}
out += 'ANNUAL_SEED_RECORDS_END\n';

fs.writeFileSync('seed_gen_output.txt', out);
console.log('Done. Eval:', records.length, 'Perms:', permRecs.length, 'Annual:', annualRecs.length);
