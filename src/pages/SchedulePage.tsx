import { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  CalendarDays, Plus, Pencil, Trash2, X, Save,
  AlertTriangle, Upload, ChevronLeft, ChevronRight,
  Download, Search,
} from 'lucide-react'
import { useSchedule }      from '@/hooks/useSchedule'
import { useDataEngine }    from '@/hooks/useDataEngine'
import { useWorkingDayOff } from '@/hooks/useWorkingDayOff'
import { useRegion }        from '@/context/RegionContext'
import type { Region }      from '@/types/hr'
import { getEmpName }       from '@/data/seedData'
import type { ScheduleEntry, ScheduleCellType } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'


const WE = '#6B21A8'

// ── Branch cell colors ────────────────────────────────────────────────────

const BRANCH_CELL: Record<string, { bg: string; fg: string; short: string }> = {
  // South Menia
  'br-01': { bg: 'rgba(220,38,38,0.22)',   fg: '#fca5a5', short: 'ملوى'    },
  'br-02': { bg: 'rgba(124,58,237,0.22)',  fg: '#c4b5fd', short: 'دير مواس'},
  'br-03': { bg: 'rgba(22,163,74,0.22)',   fg: '#86efac', short: 'دلجا'    },
  'br-04': { bg: 'rgba(4,120,87,0.22)',    fg: '#6ee7b7', short: 'ابوقرقاص'},
  'br-05': { bg: 'rgba(159,18,57,0.25)',   fg: '#fda4af', short: 'المنيا'  },
  'br-06': { bg: 'rgba(161,98,7,0.25)',    fg: '#fde047', short: 'منيا ج.' },
  'br-07': { bg: 'rgba(63,98,18,0.28)',    fg: '#bef264', short: 'بني أحمد'},
  'br-08': { bg: 'rgba(30,64,175,0.25)',   fg: '#93c5fd', short: 'صفط'     },
  // North Menia
  'br-n01': { bg: 'rgba(14,116,144,0.25)',  fg: '#67e8f9', short: 'سمالوط'  },
  'br-n02': { bg: 'rgba(6,78,59,0.28)',     fg: '#6ee7b7', short: 'بني مزار'},
  'br-n03': { bg: 'rgba(194,65,12,0.25)',   fg: '#fdba74', short: 'مغاغة'   },
  'br-n04': { bg: 'rgba(109,40,217,0.25)',  fg: '#ddd6fe', short: 'المنيا م.'},
  'br-n05': { bg: 'rgba(31,41,55,0.35)',    fg: '#d1d5db', short: 'العدوة'  },
  'br-n06': { bg: 'rgba(180,83,9,0.25)',    fg: '#fcd34d', short: 'مطاي'    },
}

type CellStyle = { bg: string; fg: string; label: string; sub?: string }

function cellStyle(entry: ScheduleEntry, branchName?: string): CellStyle {
  const ct = entry.cellType ?? 'branch'
  switch (ct) {
    case 'off':    return { bg: 'rgba(75,85,99,0.28)',   fg: '#9ca3af', label: 'Off' }
    case 'annual': return { bg: 'rgba(245,158,11,0.22)', fg: '#fbbf24', label: 'سنوي' }
    case 'sick':   return { bg: 'rgba(239,68,68,0.22)',  fg: '#fca5a5', label: 'مريض' }
    case 'visit': {
      const s = entry.branchId ? BRANCH_CELL[entry.branchId] : null
      return { bg: s?.bg ?? 'rgba(245,158,11,0.18)', fg: s?.fg ?? '#fcd34d', label: '(زيارة)', sub: s?.short ?? branchName }
    }
    case 'swap':  return { bg: 'rgba(20,184,166,0.22)', fg: '#5eead4', label: '↔ تبديل', sub: entry.note.slice(0, 12) || undefined }
    case 'note':  return { bg: 'rgba(107,33,168,0.18)', fg: '#c4b5fd', label: entry.note.slice(0, 16) || '—' }
    case 'empty': return { bg: 'transparent', fg: '#4b5563', label: '' }
    case 'branch': {
      const s = entry.branchId ? BRANCH_CELL[entry.branchId] : null
      if (!s) return { bg: `${WE}22`, fg: '#c4b5fd', label: branchName?.slice(0, 8) ?? '?' }
      const timeStr = entry.startTime ? `${entry.startTime}${entry.endTime ? `–${entry.endTime}` : ''}` : ''
      return { bg: s.bg, fg: s.fg, label: s.short, sub: timeStr || entry.note.slice(0, 10) || undefined }
    }
    default: return { bg: 'transparent', fg: '#4b5563', label: '' }
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function fmtDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.toLocaleDateString('ar-EG', { weekday: 'short' })
  const dd  = String(d.getDate()).padStart(2, '0')
  const mm  = String(d.getMonth() + 1).padStart(2, '0')
  return { dow, day: `${dd}/${mm}` }
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr + 'T00:00:00').getDay()
  return day === 5 || day === 6
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

// ── Entry modal ───────────────────────────────────────────────────────────

const CELL_TYPE_LABELS: { value: ScheduleCellType; label: string }[] = [
  { value: 'branch',  label: 'عمل في فرع'       },
  { value: 'swap',    label: '↔ تبديل يوم'       },
  { value: 'off',     label: 'إجازة / راحة'      },
  { value: 'annual',  label: 'إجازة سنوية'       },
  { value: 'sick',    label: 'إجازة مرضية'       },
  { value: 'visit',   label: 'زيارة'             },
  { value: 'note',    label: 'ملاحظة خاصة'       },
  { value: 'empty',   label: '— فارغ (مسح) —'   },
]

function EntryModal({
  editing, fixedEmployee, fixedDate, employees, branches, onClose, onSave, onSavePair, onDelete,
}: {
  editing:        ScheduleEntry | null
  fixedEmployee:  string | null
  fixedDate:      string | null
  employees:      ReturnType<typeof useSchedule>['employees']
  branches:       ReturnType<typeof useSchedule>['branches']
  onClose:        () => void
  onSave:         (input: ScheduleInput) => void
  onSavePair?:    (a: ScheduleInput, b: ScheduleInput) => void
  onDelete?:      () => void
}) {
  const isNew = !editing
  const [employeeId,          setEmployeeId]          = useState(editing?.employeeId ?? fixedEmployee ?? '')
  const [cellType,            setCellType]            = useState<ScheduleCellType>(editing?.cellType ?? 'branch')
  const [branchId,            setBranchId]            = useState(editing?.branchId   ?? '')
  const [date,                setDate]                = useState(editing?.date        ?? fixedDate ?? todayStr())
  const [startTime,           setStartTime]           = useState(editing?.startTime  ?? '')
  const [endTime,             setEndTime]             = useState(editing?.endTime    ?? '')
  const [note,                setNote]                = useState(editing?.note        ?? '')
  const [swapWithEmployeeId,  setSwapWithEmployeeId]  = useState(editing?.swapWithEmployeeId ?? '')
  const [addPairedEntry,      setAddPairedEntry]      = useState(false)

  const showBranch = cellType === 'branch' || cellType === 'visit' || cellType === 'swap'
  const showTime   = cellType === 'branch' || cellType === 'visit' || cellType === 'swap'
  const showNote   = cellType !== 'empty'
  const isSwap     = cellType === 'swap'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !date) return
    // Auto-build swap note if empty
    const myEmp      = employees.find(e => e.id === employeeId)
    const partnerEmp = employees.find(e => e.id === swapWithEmployeeId)
    const autoNoteA  = note || (isSwap && partnerEmp ? `تبديل مع ${getEmpName(partnerEmp)}` : note)
    const autoNoteB  = note || (isSwap && myEmp      ? `تبديل مع ${getEmpName(myEmp)}`      : note)

    const inputA: ScheduleInput = {
      employeeId,
      branchId: branchId || undefined,
      date, cellType,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      note: autoNoteA,
      swapWithEmployeeId: isSwap && swapWithEmployeeId ? swapWithEmployeeId : undefined,
    }
    // If paired entry requested (swap only, new entry, partner selected)
    if (isNew && isSwap && addPairedEntry && swapWithEmployeeId && onSavePair) {
      const inputB: ScheduleInput = {
        employeeId: swapWithEmployeeId,
        branchId: branchId || undefined,
        date, cellType: 'swap',
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        note: autoNoteB,
        swapWithEmployeeId: employeeId,
      }
      onSavePair(inputA, inputB)
    } else {
      onSave(inputA)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
              {isNew ? <Plus size={14} style={{ color: WE }} /> : <Pencil size={14} style={{ color: WE }} />}
            </div>
            <h2 className="text-sm font-black text-primary">{isNew ? 'إضافة خلية' : 'تعديل خلية'}</h2>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors" title="حذف">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3" style={{ direction: 'rtl' }}>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الموظف <span className="text-red-500">*</span></label>
            {fixedEmployee ? (
              <p className="we-input text-primary font-semibold text-sm cursor-default">
                {getEmpName(employees.find(e => e.id === fixedEmployee)!)}
              </p>
            ) : (
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="we-input" required>
                <option value="">اختر الموظف</option>
                {employees.map(e => <option key={e.id} value={e.id}>{getEmpName(e)}</option>)}
              </select>
            )}
          </div>
          {!fixedDate && (
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">التاريخ <span className="text-red-500">*</span></label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" required />
            </div>
          )}
          {fixedDate && (
            <div className="text-xs text-secondary px-1">التاريخ: <span className="font-bold text-primary num">{fixedDate}</span></div>
          )}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">نوع الخلية</label>
            <select value={cellType} onChange={e => setCellType(e.target.value as ScheduleCellType)} className="we-input">
              {CELL_TYPE_LABELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* Swap partner selector */}
          {isSwap && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)' }}>
              <label className="block text-xs font-bold mb-1" style={{ color: '#5eead4' }}>موظف التبديل <span className="text-red-500">*</span></label>
              <select value={swapWithEmployeeId} onChange={e => setSwapWithEmployeeId(e.target.value)} className="we-input" required={isSwap}>
                <option value="">— اختر الموظف الآخر —</option>
                {employees.filter(e => e.id !== employeeId).map(e => (
                  <option key={e.id} value={e.id}>{getEmpName(e)}</option>
                ))}
              </select>
              {isNew && swapWithEmployeeId && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={addPairedEntry} onChange={e => setAddPairedEntry(e.target.checked)}
                    className="rounded" />
                  <span className="text-xs font-semibold" style={{ color: '#5eead4' }}>
                    أضف الخلية المقابلة للموظف الآخر تلقائياً
                  </span>
                </label>
              )}
            </div>
          )}
          {showBranch && (
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">الفرع</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input">
                <option value="">— اختر الفرع —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.storeNameAr || b.storeName}</option>)}
              </select>
            </div>
          )}
          {showTime && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">من</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="we-input" />
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">إلى</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="we-input" />
              </div>
            </div>
          )}
          {showNote && (
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">ملاحظة</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظة..." className="we-input" maxLength={120} />
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={!employeeId || !date || (isSwap && !swapWithEmployeeId)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              {isNew
                ? <><Plus size={14} />{isSwap && addPairedEntry && swapWithEmployeeId ? 'إضافة الخليتين' : 'إضافة'}</>
                : <><Save size={14} />حفظ</>}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-elevated transition-colors"
              style={{ color: 'var(--text-secondary)' }}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── HTML Import ───────────────────────────────────────────────────────────

const BRANCH_ALIASES: Record<string, string> = {
  mallawy: 'br-01', malawy: 'br-01', ملوى: 'br-01',
  dirmawas: 'br-02', dermawas: 'br-02', dirmoaws: 'br-02', 'دير مواس': 'br-02',
  dalga: 'br-03', دلجا: 'br-03',
  abokurkas: 'br-04', ابوقرقاص: 'br-04',
  menia: 'br-05', minya: 'br-05', المنيا: 'br-05', elmenia: 'br-05',
  'el meniael gidida': 'br-06', newminya: 'br-06', المنياالجديدة: 'br-06', 'المنيا الجديدة': 'br-06',
  'elmeniael gidida': 'br-06', 'elmeniaelgidida': 'br-06',
  baniahmed: 'br-07', 'بني أحمد': 'br-07',
  saftelkhammar: 'br-08', 'صفط الخمار': 'br-08', saftelkhammar2: 'br-08',
}
function normBranchKey(s: string) { return s.toLowerCase().replace(/\s+/g, '') }
function matchBranch(name: string) { return BRANCH_ALIASES[normBranchKey(name)] ?? BRANCH_ALIASES[name] ?? null }
function parseTimeAmPm(line: string): string {
  const m = line.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (!m) return ''
  let h = parseInt(m[1]); const min = m[2]; const ap = m[3].toLowerCase()
  if (ap === 'pm' && h !== 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}

// Regex-based HTML parser — handles malformed schedule HTML where data rows have </tr>
// but no opening <tr> (HTML5 foster-parenting breaks DOMParser for this case).
function parseScheduleHTML(html: string, employees: ReturnType<typeof useSchedule>['employees']) {
  // Find the schedule table section (id='myTable1' or id="myTable1")
  const tableIdx = html.search(/id=['"]myTable1['"]/i)
  const tableSection = tableIdx >= 0 ? html.slice(tableIdx) : html

  // Extract cell content using regex — each <td>...</td> in order
  function extractCells(chunk: string): string[] {
    const cells: string[] = []
    const re = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(chunk)) !== null) {
      // Convert <br> to newline, strip remaining tags, collapse whitespace
      const text = m[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/[ \t]+/g, ' ')
        .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
      cells.push(text)
    }
    return cells
  }

  // Split table into rows on </tr> — data rows end with </tr> even without opening <tr>
  const rowChunks = tableSection.split('</tr>').filter(c => /<td/i.test(c))
  if (rowChunks.length < 2) return { entries: [] as ScheduleInput[], datesFound: [] as string[], warnings: ['لم يتم العثور على بيانات في الجدول'] }

  // Header row — first chunk
  const headerCells = extractCells(rowChunks[0])
  const colEmpId: (string | '__SEP__' | null)[] = []
  for (let i = 1; i < headerCells.length; i++) {
    const txt = headerCells[i].replace(/\n/g, ' ').trim()
    if (/senior|^#/i.test(txt)) { colEmpId.push('__SEP__'); continue }
    const codeMatch = txt.match(/^(\d+)/)
    if (codeMatch) {
      const emp = employees.find(e => e.employeeCode === codeMatch[1])
      colEmpId.push(emp?.id ?? null)
    } else { colEmpId.push(null) }
  }
  if (!colEmpId.length) return { entries: [] as ScheduleInput[], datesFound: [] as string[], warnings: ['لم يتم التعرف على أعمدة الموظفين'] }

  const entries: ScheduleInput[] = []
  const datesFound: string[] = []
  const unmatchedBranches = new Set<string>()

  // Data rows — remaining chunks
  for (let ri = 1; ri < rowChunks.length; ri++) {
    const cells = extractCells(rowChunks[ri])
    if (!cells.length) continue
    const dateText = cells[0]
    const dm = dateText.match(/(\d{2})-(\d{2})-(\d{4})/)
    if (!dm) continue
    const date = `${dm[3]}-${dm[2]}-${dm[1]}`
    datesFound.push(date)

    for (let ci = 1; ci < cells.length && ci - 1 < colEmpId.length; ci++) {
      const empId = colEmpId[ci - 1]
      if (!empId || empId === '__SEP__') continue
      const raw  = cells[ci]
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
      if (!lines.length) continue
      const first = lines[0]; const lc = first.toLowerCase()

      let cellType: ScheduleCellType = 'empty'
      let branchId: string | undefined, startTime: string | undefined, endTime: string | undefined, note = ''

      if (lc === 'off' || lc === 'راحة') {
        cellType = 'off'
      } else if (lc.startsWith('annual') || lc.startsWith('سنوي')) {
        cellType = 'annual'
      } else if (lc.startsWith('sick') || lc.startsWith('مريض')) {
        cellType = 'sick'
      } else if (lc.includes('visits') || lc.includes('زيارة')) {
        cellType = 'visit'
        // Branch name: strip (VISITS) from first line; if empty, look in next lines
        const branchRaw = first.replace(/\(VISITS\)/gi, '').trim()
        const branchLine = branchRaw
          || lines.find(l => !/\(VISITS\)/i.test(l) && !/^from:/i.test(l) && !/^to:/i.test(l) && l !== first)
          || ''
        branchId = matchBranch(branchLine) ?? undefined
        if (!branchId && branchLine) unmatchedBranches.add(branchLine)
        const fromL = lines.find(l => /^from:/i.test(l))
        const toL   = lines.find(l => /^to:/i.test(l))
        if (fromL) startTime = parseTimeAmPm(fromL)
        if (toL)   endTime   = parseTimeAmPm(toL)
      } else {
        // Branch assignment — possibly with Arabic holiday note on first line
        // Strip Arabic suffix from branch name
        const branchRaw = first.replace(/[\u0600-\u06FF\s]+$/, '').trim()
        branchId = matchBranch(branchRaw) ?? matchBranch(first) ?? undefined
        if (!branchId) {
          unmatchedBranches.add(first); cellType = 'note'; note = first
        } else {
          cellType = 'branch'
          const fromL = lines.find(l => /^from:/i.test(l))
          const toL   = lines.find(l => /^to:/i.test(l))
          if (fromL) startTime = parseTimeAmPm(fromL)
          if (toL)   endTime   = parseTimeAmPm(toL)
          const arNote = lines.find(l => /[\u0600-\u06FF]/.test(l))
          if (arNote) note = arNote
        }
      }

      if (cellType !== ('empty' as string)) {
        entries.push({ employeeId: empId, branchId, date, cellType, startTime, endTime, note })
      }
    }
  }

  const warnings: string[] = []
  if (unmatchedBranches.size) warnings.push(`فروع غير معروفة: ${[...unmatchedBranches].join('، ')}`)
  return { entries, datesFound: [...new Set(datesFound)], warnings }
}

// ── Import modal ──────────────────────────────────────────────────────────

function parseScheduleExcel(wb: XLSX.WorkBook, employees: ReturnType<typeof useSchedule>['employees']) {
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false }) as string[][]
  if (rows.length < 2) return { entries: [] as ScheduleInput[], datesFound: [] as string[], warnings: ['الملف فارغ'] }

  const headerRow = rows[0]
  const colEmpId: (string | '__SEP__' | null)[] = []
  for (let i = 1; i < headerRow.length; i++) {
    const txt = String(headerRow[i] ?? '').trim()
    if (/senior|#/i.test(txt)) { colEmpId.push('__SEP__'); continue }
    const codeMatch = txt.match(/^(\d+)/)
    if (codeMatch) {
      const emp = employees.find(e => e.employeeCode === codeMatch[1])
      colEmpId.push(emp?.id ?? null)
    } else { colEmpId.push(null) }
  }

  const entries: ScheduleInput[] = []
  const datesFound: string[] = []
  const unmatchedBranches = new Set<string>()

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri]
    const dateText = String(row[0] ?? '').trim()
    const dm = dateText.match(/(\d{2})-(\d{2})-(\d{4})/) // DD-MM-YYYY
    if (!dm) continue
    const date = `${dm[3]}-${dm[2]}-${dm[1]}`
    datesFound.push(date)
    for (let ci = 1; ci < row.length && ci - 1 < colEmpId.length; ci++) {
      const empId = colEmpId[ci - 1]
      if (!empId || empId === '__SEP__') continue
      const val = String(row[ci] ?? '').trim()
      if (!val) continue
      const lc = val.toLowerCase()
      let cellType: ScheduleCellType = 'empty'
      let branchId: string | undefined, startTime: string | undefined, endTime: string | undefined, note = ''
      if (lc === 'off' || lc === 'راحة') { cellType = 'off' }
      else if (lc.startsWith('annual')) { cellType = 'annual' }
      else if (lc.startsWith('sick')) { cellType = 'sick' }
      else if (lc.includes('visits') || lc.includes('زيارة')) {
        cellType = 'visit'
        const branchRaw = val.replace(/\(VISITS\)/gi, '').split('From:')[0].trim()
        branchId = matchBranch(branchRaw) ?? undefined
        if (!branchId) unmatchedBranches.add(branchRaw)
        startTime = parseTimeAmPm(val); endTime = parseTimeAmPm(val.replace(/.*From:/, 'To:'))
      } else {
        const branchRaw = val.split('From:')[0].replace(/[\u0600-\u06FF\s]+$/, '').trim()
        branchId = matchBranch(branchRaw) ?? undefined
        if (!branchId) { unmatchedBranches.add(branchRaw); cellType = 'note'; note = branchRaw }
        else {
          cellType = 'branch'
          startTime = parseTimeAmPm(val)
          const toIdx = val.indexOf('To:'); if (toIdx > -1) endTime = parseTimeAmPm(val.slice(toIdx))
          const arNote = val.match(/[\u0600-\u06FF\s]{3,}/)?.[0].trim(); if (arNote) note = arNote
        }
      }
      if (cellType !== ('empty' as string)) {
        entries.push({ employeeId: empId, branchId, date, cellType, startTime, endTime, note })
      }
    }
  }
  const warnings: string[] = unmatchedBranches.size ? [`فروع غير معروفة: ${Array.from(unmatchedBranches).join('، ')}`] : []
  return { entries, datesFound: [...new Set(datesFound)], warnings }
}

function ImportModal({ employees, onClose, onApply }: {
  employees: ReturnType<typeof useSchedule>['employees']
  onClose:   () => void
  onApply:   (entries: ScheduleInput[], dates: string[]) => void
}) {
  const [html,     setHtml]     = useState('')
  const [fileName, setFileName] = useState('')
  const [parsed,   setParsed]   = useState<ReturnType<typeof parseScheduleHTML> | null>(null)
  const [loading,  setLoading]  = useState(false)

  function handleFile(file: File) {
    setFileName(file.name); setParsed(null); setHtml('')
    const isExcel = /\.xlsx?$/i.test(file.name)
    const isHtml  = /\.html?$/i.test(file.name)
    setLoading(true)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const result = e.target?.result
        if (isExcel && result instanceof ArrayBuffer) {
          const wb = XLSX.read(new Uint8Array(result), { type: 'array' })
          setParsed(parseScheduleExcel(wb, employees))
        } else if (isHtml && typeof result === 'string') {
          setHtml(result)
          setParsed(parseScheduleHTML(result, employees))
        }
      } catch { setParsed({ entries: [], datesFound: [], warnings: ['خطأ في قراءة الملف'] }) }
      setLoading(false)
    }
    if (isExcel) reader.readAsArrayBuffer(file)
    else reader.readAsText(file, 'utf-8')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
              <Upload size={14} style={{ color: WE }} />
            </div>
            <h2 className="text-sm font-black text-primary">استيراد الجدول</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4" style={{ direction: 'rtl' }}>
          {/* File upload */}
          <label className="block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all hover:opacity-80"
            style={{ borderColor: `${WE}44`, background: `${WE}08` }}>
            <input type="file" accept=".htm,.html,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
            <Upload size={22} className="mx-auto mb-2" style={{ color: WE }} />
            <p className="text-sm font-bold text-primary">{fileName || 'اختر ملف جدول'}</p>
            <p className="text-xs text-secondary mt-1">HTML · Excel (.xlsx)</p>
          </label>

          {/* Or paste HTML */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">أو الصق HTML الجدول</label>
            <textarea value={html} onChange={e => { setHtml(e.target.value); setParsed(null); setFileName('') }}
              className="we-input w-full font-mono text-xs" rows={5} placeholder="<table ...>...</table>" style={{ resize: 'vertical' }} />
            {html.trim() && (
              <button onClick={() => setParsed(parseScheduleHTML(html, employees))}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ background: `${WE}22`, color: WE }}>تحليل</button>
            )}
          </div>

          {loading && <p className="text-sm text-secondary text-center">⏳ جاري التحليل...</p>}

          {parsed && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex gap-4 text-sm">
                <span><span className="font-black text-primary num">{parsed.entries.length}</span><span className="text-secondary mr-1">خلية</span></span>
                <span><span className="font-black text-primary num">{parsed.datesFound.length}</span><span className="text-secondary mr-1">يوم</span></span>
              </div>
              {parsed.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-400 flex items-start gap-1.5"><AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />{w}</p>
              ))}
              {!parsed.entries.length && <p className="text-xs text-red-400">لم يُستخرَج أي بيانات.</p>}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0" style={{ direction: 'rtl' }}>
          <button onClick={() => { if (!parsed?.entries.length) return; if (window.confirm(`سيتم استبدال ${parsed.datesFound.length} يوم. المتابعة؟`)) { onApply(parsed.entries, parsed.datesFound); onClose() } }}
            disabled={!parsed?.entries.length}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            <Download size={14} /> تطبيق واستبدال
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────

function FilterBar({ search, branch, dateFrom, dateTo, branches, onSearch, onBranch, onDateFrom, onDateTo, onClear }: {
  search: string; branch: string; dateFrom: string; dateTo: string
  branches: ReturnType<typeof useSchedule>['branches']
  onSearch: (v: string) => void; onBranch: (v: string) => void
  onDateFrom: (v: string) => void; onDateTo: (v: string) => void
  onClear: () => void
}) {
  const hasFilter = !!(search || branch || dateFrom || dateTo)
  return (
    <div className="card p-3 mb-4 flex flex-wrap items-center gap-2" style={{ direction: 'rtl' }}>
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search size={12} className="absolute top-1/2 -translate-y-1/2 right-3 text-tertiary pointer-events-none" />
        <input value={search} onChange={e => onSearch(e.target.value)}
          placeholder="بحث بالاسم أو الكود..."
          className="we-input pr-8 text-xs w-full" />
      </div>
      {/* Branch */}
      <select value={branch} onChange={e => onBranch(e.target.value)}
        className="we-input text-xs flex-shrink-0" style={{ width: 150 }}>
        <option value="">كل المراكز</option>
        {branches.map(b => <option key={b.id} value={b.id}>{b.storeNameAr || b.storeName}</option>)}
      </select>
      {/* Date from */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-tertiary">من</span>
        <input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} className="we-input text-xs" style={{ width: 135 }} />
      </div>
      {/* Date to */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-tertiary">إلى</span>
        <input type="date" value={dateTo} onChange={e => onDateTo(e.target.value)} className="we-input text-xs" style={{ width: 135 }} />
      </div>
      {hasFilter && (
        <button onClick={onClear}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-elevated flex-shrink-0"
          style={{ color: '#DC2626' }}>
          <X size={11} /> مسح
        </button>
      )}
    </div>
  )
}

// ── Matrix grid ───────────────────────────────────────────────────────────

function MatrixGrid({ days, employees, branches, entries, onCellClick }: {
  days:        string[]
  employees:   ReturnType<typeof useSchedule>['employees']
  branches:    ReturnType<typeof useSchedule>['branches']
  entries:     ScheduleEntry[]
  onCellClick: (empId: string, date: string, entry: ScheduleEntry | null) => void
}) {
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])
  const empMap   = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees])
  const agents  = useMemo(() => employees.filter(e => e.role !== 'Senior').sort((a, b) => +a.employeeCode - +b.employeeCode), [employees])
  const seniors = useMemo(() => employees.filter(e => e.role === 'Senior').sort((a, b) => +a.employeeCode - +b.employeeCode), [employees])
  const allCols = useMemo<(typeof employees[0] | null)[]>(() => [...agents, null, ...seniors], [agents, seniors])
  const entryIndex = useMemo(() => {
    const m: Record<string, ScheduleEntry> = {}
    for (const e of entries) m[`${e.employeeId}|${e.date}`] = e
    return m
  }, [entries])
  const today = todayStr()
  const COL_W = 112, DATE_W = 78, SEP_W = 28, ROW_H = 52
  const stickyBg = 'var(--bg-surface)', borderClr = 'var(--border)'
  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', position: 'relative' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: `${DATE_W + allCols.length * COL_W}px` }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 40, width: DATE_W, minWidth: DATE_W, background: stickyBg, borderBottom: `1px solid ${borderClr}`, borderRight: `1px solid ${borderClr}`, padding: '6px 8px', textAlign: 'center' }}>
              <span className="text-[10px] font-bold text-tertiary">التاريخ</span>
            </th>
            {allCols.map((emp) => emp === null ? (
              <th key="__sep__" style={{ position: 'sticky', top: 0, zIndex: 30, width: SEP_W, minWidth: SEP_W, background: '#111', borderBottom: '1px solid #333', padding: 2 }}>
                <div style={{ writingMode: 'vertical-rl', color: '#ef4444', fontSize: 9, fontWeight: 900, textAlign: 'center' }}># Seniors #</div>
              </th>
            ) : (
              <th key={emp.id} style={{ position: 'sticky', top: 0, zIndex: 30, width: COL_W, minWidth: COL_W, maxWidth: COL_W, background: stickyBg, borderBottom: `1px solid ${borderClr}`, borderRight: `1px solid ${borderClr}`, padding: '4px 4px', textAlign: 'center', verticalAlign: 'bottom' }}>
                <div style={{ overflow: 'hidden' }}>
                  <p className="num" style={{ fontSize: 10, fontWeight: 900, color: WE }}>{emp.employeeCode}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-tertiary)', lineHeight: 1.2, overflow: 'hidden', maxHeight: 28 }}>{getEmpName(emp)}</p>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(date => {
            const { dow, day } = fmtDateLabel(date)
            const isToday = date === today, isWknd = isWeekend(date)
            const dateBg = isToday ? `${WE}18` : isWknd ? 'rgba(255,204,0,0.12)' : stickyBg
            return (
              <tr key={date}>
                <td style={{ position: 'sticky', left: 0, zIndex: 10, width: DATE_W, minWidth: DATE_W, background: dateBg, borderBottom: `1px solid ${borderClr}`, borderRight: `1px solid ${borderClr}`, padding: '4px 6px', textAlign: 'center', height: ROW_H }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: isToday ? WE : isWknd ? '#d97706' : 'var(--text-secondary)' }}>{dow}</p>
                  <p className="num" style={{ fontSize: 11, fontWeight: 900, color: isToday ? WE : 'var(--text-primary)' }}>{day}</p>
                  {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: WE, margin: '1px auto 0' }} />}
                </td>
                {allCols.map((emp) => emp === null ? (
                  <td key="__sep__" style={{ width: SEP_W, minWidth: SEP_W, background: '#111', borderBottom: '1px solid #222' }} />
                ) : (
                  <td key={emp.id} onClick={() => onCellClick(emp.id, date, entryIndex[`${emp.id}|${date}`] ?? null)}
                    title={entryIndex[`${emp.id}|${date}`]?.branchId ? branchMap[entryIndex[`${emp.id}|${date}`]!.branchId!]?.storeName : undefined}
                    style={{ width: COL_W, minWidth: COL_W, maxWidth: COL_W, height: ROW_H, borderBottom: `1px solid ${borderClr}`, borderRight: `1px solid ${borderClr}`, padding: 3, cursor: 'pointer', background: isWknd && !entryIndex[`${emp.id}|${date}`] ? 'rgba(255,204,0,0.04)' : undefined }}>
                    {(() => {
                      const entry = entryIndex[`${emp.id}|${date}`] ?? null
                      const branch = entry?.branchId ? branchMap[entry.branchId] : undefined
                      let cs = entry ? cellStyle(entry, branch?.storeNameAr || branch?.storeName) : { bg: 'transparent', fg: '#4b5563', label: '', sub: undefined }
                      // For swap: show partner's first name as sub-label
                      if (entry?.cellType === 'swap') {
                        const partner = entry.swapWithEmployeeId ? empMap[entry.swapWithEmployeeId] : null
                        const partnerShort = partner ? getEmpName(partner).split(' ')[0] : (entry.note.slice(0, 10) || '—')
                        cs = { ...cs, label: '↔', sub: partnerShort }
                      }
                      return cs.label ? (
                        <div style={{ background: cs.bg, color: cs.fg, borderRadius: 6, padding: '2px 4px', fontSize: 10, fontWeight: 700, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, lineHeight: 1.2 }}>
                          <span>{cs.label}</span>
                          {cs.sub && <span style={{ fontSize: 9, opacity: 0.8, fontWeight: 400 }}>{cs.sub}</span>}
                        </div>
                      ) : (
                        <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s', color: '#6b7280', fontSize: 14, userSelect: 'none' }} className="hover:!opacity-100">+</div>
                      )
                    })()}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── 6-day branch rule helpers ─────────────────────────────────────────────

const SIX_DAY_BRANCHES = new Set(['br-03', 'br-07', 'br-08'])

function getISOWeekKey(dateStr: string): string {
  // Returns "YYYY-Www" for grouping weeks (iso week)
  const d = new Date(dateStr + 'T00:00:00')
  const thu = new Date(d)
  thu.setDate(d.getDate() + (4 - (d.getDay() || 7)))
  const yr = thu.getFullYear()
  const yr1Jan = new Date(yr, 0, 1)
  const wk = Math.ceil(((thu.getTime() - yr1Jan.getTime()) / 86400000 + 1) / 7)
  return `${yr}-W${String(wk).padStart(2, '0')}`
}

function getFridaysInMonth(year: number, month: number): string[] {
  const fridays: string[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 5) fridays.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return fridays
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { region } = useRegion()
  // key=region forces full remount when region changes → hooks reinitialize correctly
  return <SchedulePageInner key={region} region={region} />
}

function SchedulePageInner({ region }: { region: Region }) {
  const { employees, branches, entries, alerts, addEntry, addEntries, updateEntry, deleteEntry, resetEntries, overwriteEntries } = useSchedule(region)
  const { records: wdoRecords, addBulkRecords: addBulkWDORecords } = useWorkingDayOff()
  const { ouChangeAlerts: _ouChangeAlerts } = useDataEngine() // retained, not rendered

  const [year,  setYear]  = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)

  // Entry modal
  const [modal,         setModal]         = useState(false)
  const [editing,       setEditing]       = useState<ScheduleEntry | null>(null)
  const [fixedEmployee, setFixedEmployee] = useState<string | null>(null)
  const [fixedDate,     setFixedDate]     = useState<string | null>(null)
  const [importModal,   setImportModal]   = useState(false)

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')

  const days = useMemo(() => getDaysInMonth(year, month), [year, month])

  // ── Auto-add 6-day branch comp Fridays to WDO ───────────────────────────
  useEffect(() => {
    if (entries.length === 0) return

    // Build (empId → month → distinctWeeks) map
    const byEmpMonth: Record<string, Record<string, { weeks: Set<string>; primaryBranch: string }>> = {}
    for (const e of entries) {
      if (!e.branchId || !SIX_DAY_BRANCHES.has(e.branchId)) continue
      const ct = e.cellType ?? 'branch'
      if (ct !== 'branch' && ct !== 'visit' && ct !== 'swap') continue
      const mon = e.date.slice(0, 7)
      const wk  = getISOWeekKey(e.date)
      if (!byEmpMonth[e.employeeId]) byEmpMonth[e.employeeId] = {}
      if (!byEmpMonth[e.employeeId][mon])
        byEmpMonth[e.employeeId][mon] = { weeks: new Set(), primaryBranch: e.branchId }
      byEmpMonth[e.employeeId][mon].weeks.add(wk)
    }

    // Collect Fridays to add (not already in wdoRecords)
    const wdoKeys = new Set(wdoRecords.map(r => `${r.employeeId}|${r.date}`))
    const toAdd: import('@/hooks/useWorkingDayOff').WorkingDayOffInput[] = []

    for (const [empId, monthMap] of Object.entries(byEmpMonth)) {
      for (const [mon, { weeks, primaryBranch }] of Object.entries(monthMap)) {
        const compEarned = Math.floor(weeks.size / 2)
        if (compEarned === 0) continue
        const [yr, mo] = mon.split('-').map(Number)
        const fridays  = getFridaysInMonth(yr, mo).slice(0, compEarned)
        for (const fri of fridays) {
          const key = `${empId}|${fri}`
          if (!wdoKeys.has(key)) {
            const monthLabel = new Date(mon + '-01T00:00:00')
              .toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
            toAdd.push({
              employeeId: empId,
              branchId:   primaryBranch,
              date:       fri,
              note:       `تعويض الجمعة - قانون 6 أيام (${monthLabel})`,
            })
            wdoKeys.add(key) // prevent duplicate within same batch
          }
        }
      }
    }

    if (toAdd.length > 0) addBulkWDORecords(toAdd)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]) // intentionally omit wdoRecords — only re-run when schedule changes

  const monthEntries = useMemo(
    () => entries.filter(e => e.date.startsWith(`${year}-${String(month).padStart(2,'0')}`)),
    [entries, year, month],
  )

  // Filtered employees for matrix columns
  const filteredEmployees = useMemo(() => {
    let emps = employees
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase()
      emps = emps.filter(e =>
        getEmpName(e).toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.user || '').toLowerCase().includes(q)
      )
    }
    if (filterBranch) {
      const hasEntry = new Set(monthEntries.filter(en => en.branchId === filterBranch).map(en => en.employeeId))
      emps = emps.filter(e => hasEntry.has(e.id))
    }
    return emps
  }, [employees, filterSearch, filterBranch, monthEntries])

  // Filtered days for matrix rows
  const filteredDays = useMemo(() => days.filter(d => {
    if (filterFrom && d < filterFrom) return false
    if (filterTo   && d > filterTo)   return false
    return true
  }), [days, filterFrom, filterTo])

  function openAdd()                                 { setEditing(null); setFixedEmployee(null); setFixedDate(null); setModal(true) }
  function openAddFromCell(empId: string, date: string) { setEditing(null); setFixedEmployee(empId); setFixedDate(date); setModal(true) }
  function openEdit(e: ScheduleEntry)               { setEditing(e); setFixedEmployee(null); setFixedDate(null); setModal(true) }
  function closeModal()                             { setModal(false); setEditing(null); setFixedEmployee(null); setFixedDate(null) }
  function handleSave(input: ScheduleInput)         { if (editing) updateEntry(editing.id, input); else addEntry(input); closeModal() }
  function handleSavePair(a: ScheduleInput, b: ScheduleInput) { addEntries([a, b]); closeModal() }
  function handleDelete()                           { if (!editing) return; if (window.confirm('حذف هذه الخلية؟')) { deleteEntry(editing.id); closeModal() } }
  function handleCellClick(empId: string, date: string, entry: ScheduleEntry | null) { if (entry) openEdit(entry); else openAddFromCell(empId, date) }
  function prevMonth() { if (month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1) }
  function nextMonth() { if (month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1) }

  const monthLabel   = new Date(year, month - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
  const todayDisplay = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const LEGEND = [
    { label: 'راحة',    bg: 'rgba(75,85,99,0.28)',   fg: '#9ca3af' },
    { label: 'سنوي',    bg: 'rgba(245,158,11,0.22)', fg: '#fbbf24' },
    { label: 'مريض',    bg: 'rgba(239,68,68,0.22)',  fg: '#fca5a5' },
    { label: 'زيارة',   bg: 'rgba(245,158,11,0.18)', fg: '#fcd34d' },
    { label: '↔ تبديل', bg: 'rgba(20,184,166,0.22)', fg: '#5eead4' },
    { label: 'ملاحظة',  bg: 'rgba(107,33,168,0.18)', fg: '#c4b5fd' },
    ...Object.values(BRANCH_CELL).map(s => ({ label: s.short, bg: s.bg, fg: s.fg })),
  ]

  return (
    <div style={{ direction: 'rtl' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(107,33,168,0.14)' }}>
              <CalendarDays size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">الجدول</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm text-secondary">
              {monthEntries.length} خلية
              {alerts.length > 0 && <span className="font-bold mr-2" style={{ color: '#F59E0B' }}>· {alerts.length} تنبيه OU</span>}
            </p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: `${WE}12`, color: WE }}>
              اليوم: {todayDisplay}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
            style={{ background: `${WE}18`, color: WE }}>
            <Upload size={13} /> استيراد جدول
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            <Plus size={15} /> إضافة
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors"><ChevronRight size={16} /></button>
          <button onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()+1) }}
            className="px-3 py-1 rounded-lg text-xs font-semibold hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>
            هذا الشهر
          </button>
          <span className="text-sm font-black text-primary">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors"><ChevronLeft size={16} /></button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        search={filterSearch} branch={filterBranch} dateFrom={filterFrom} dateTo={filterTo}
        branches={branches}
        onSearch={setFilterSearch} onBranch={setFilterBranch}
        onDateFrom={setFilterFrom} onDateTo={setFilterTo}
        onClear={() => { setFilterSearch(''); setFilterBranch(''); setFilterFrom(''); setFilterTo('') }}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {LEGEND.map(l => (
          <span key={l.label} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: l.bg, color: l.fg }}>
            {l.label}
          </span>
        ))}
      </div>

      {/* Main content — matrix always */}
      <div className="card overflow-hidden">
        <MatrixGrid days={filteredDays} employees={filteredEmployees} branches={branches} entries={monthEntries} onCellClick={handleCellClick} />
      </div>

      {/* Reset */}
      {entries.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button onClick={() => { if (window.confirm('سيتم حذف كل الجدول. هل أنت متأكد؟')) resetEntries() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors hover:bg-red-500/10"
            style={{ color: '#DC2626' }}>
            <Trash2 size={12} /> حذف الجدول كاملاً
          </button>
        </div>
      )}

      {/* Entry modal */}
      {modal && (
        <EntryModal editing={editing} fixedEmployee={fixedEmployee} fixedDate={fixedDate}
          employees={employees} branches={branches}
          onClose={closeModal} onSave={handleSave} onSavePair={handleSavePair}
          onDelete={editing ? handleDelete : undefined} />
      )}

      {/* Import modal */}
      {importModal && (
        <ImportModal employees={employees} onClose={() => setImportModal(false)}
          onApply={(ents, dates) => overwriteEntries(ents, dates)} />
      )}
    </div>
  )
}
