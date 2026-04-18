import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  CalendarDays, Plus, Pencil, Trash2, X, Save,
  AlertTriangle, Bell, Upload, ChevronLeft, ChevronRight,
  Download, Search, Repeat2, BarChart2,
} from 'lucide-react'
import { useSchedule }   from '@/hooks/useSchedule'
import { useChangeOU }   from '@/hooks/useChangeOU'
import { getEmpName }    from '@/data/seedData'
import type { ScheduleEntry, ScheduleCellType, ChangeOURecord } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'
import type { ChangeOUInput } from '@/hooks/useChangeOU'

const WE = '#6B21A8'

// ── TEData Change OU defaults (from change ou.xlsx template) ─────────────
const COU_DEFAULTS = {
  roleName:       'Retail Technical Specialist',
  cashBoxClosed:  "we don't have cash box",
  directManager:  'Raouf Emeel',
  managerEmail:   'raouf.emeel@te.eg',
  division:       'الدعم الفنى بمنافذ البيع وزيارات العملاء',
  department:     'إدارة دعم المنافذ والعملاء',
  generalDept:    'الإدارة العامة للمبيعات بمحافظات الصعيد',
  sector:         'قطاع شمال الصعيد',
  affiliation:    'محافظة المنيا',
}


// ── Branch cell colors ────────────────────────────────────────────────────

const BRANCH_CELL: Record<string, { bg: string; fg: string; short: string }> = {
  'br-01': { bg: 'rgba(220,38,38,0.22)',   fg: '#fca5a5', short: 'ملوى'    },
  'br-02': { bg: 'rgba(124,58,237,0.22)',  fg: '#c4b5fd', short: 'دير مواس'},
  'br-03': { bg: 'rgba(22,163,74,0.22)',   fg: '#86efac', short: 'دلجا'    },
  'br-04': { bg: 'rgba(4,120,87,0.22)',    fg: '#6ee7b7', short: 'ابوقرقاص'},
  'br-05': { bg: 'rgba(159,18,57,0.25)',   fg: '#fda4af', short: 'المنيا'  },
  'br-06': { bg: 'rgba(161,98,7,0.25)',    fg: '#fde047', short: 'منيا ج.' },
  'br-07': { bg: 'rgba(63,98,18,0.28)',    fg: '#bef264', short: 'بني أحمد'},
  'br-08': { bg: 'rgba(30,64,175,0.25)',   fg: '#93c5fd', short: 'صفط'     },
  'br-09': { bg: 'rgba(5,150,105,0.25)',   fg: '#6ee7b7', short: 'بني مزار'},
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
  { value: 'off',     label: 'إجازة / راحة'      },
  { value: 'annual',  label: 'إجازة سنوية'       },
  { value: 'sick',    label: 'إجازة مرضية'       },
  { value: 'visit',   label: 'زيارة'             },
  { value: 'note',    label: 'ملاحظة خاصة'       },
  { value: 'empty',   label: '— فارغ (مسح) —'   },
]

function EntryModal({
  editing, fixedEmployee, fixedDate, employees, branches, onClose, onSave, onDelete,
}: {
  editing:       ScheduleEntry | null
  fixedEmployee: string | null
  fixedDate:     string | null
  employees:     ReturnType<typeof useSchedule>['employees']
  branches:      ReturnType<typeof useSchedule>['branches']
  onClose:       () => void
  onSave:        (input: ScheduleInput) => void
  onDelete?:     () => void
}) {
  const isNew = !editing
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? fixedEmployee ?? '')
  const [cellType,   setCellType]   = useState<ScheduleCellType>(editing?.cellType ?? 'branch')
  const [branchId,   setBranchId]   = useState(editing?.branchId   ?? '')
  const [date,       setDate]       = useState(editing?.date        ?? fixedDate ?? todayStr())
  const [startTime,  setStartTime]  = useState(editing?.startTime  ?? '')
  const [endTime,    setEndTime]    = useState(editing?.endTime    ?? '')
  const [note,       setNote]       = useState(editing?.note        ?? '')

  const showBranch = cellType === 'branch' || cellType === 'visit'
  const showTime   = cellType === 'branch' || cellType === 'visit'
  const showNote   = cellType !== 'empty'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !date) return
    onSave({ employeeId, branchId: branchId || undefined, date, cellType, startTime: startTime || undefined, endTime: endTime || undefined, note })
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
            <button type="submit" disabled={!employeeId || !date}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              {isNew ? <><Plus size={14} />إضافة</> : <><Save size={14} />حفظ</>}
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
  banimazar: 'br-09', 'بني مزار': 'br-09',
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

// ── Alert banner ──────────────────────────────────────────────────────────

function AlertBanner({ alerts, employees, branches, onGoToChangeOU, onCreateCOU }: {
  alerts:          ReturnType<typeof useSchedule>['alerts']
  employees:       ReturnType<typeof useSchedule>['employees']
  branches:        ReturnType<typeof useSchedule>['branches']
  onGoToChangeOU:  () => void
  onCreateCOU:     (preset: Partial<ChangeOUInput>) => void
}) {
  const [open, setOpen] = useState(true)
  if (!alerts.length) return null
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))
  return (
    <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid #F59E0B40', background: '#F59E0B08' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ direction: 'rtl' }}>
        <button onClick={() => setOpen(o => !o)} className="flex-1 flex items-center gap-3 text-right">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F59E0B18' }}>
            <Bell size={14} style={{ color: '#F59E0B' }} />
          </div>
          <div className="flex-1 text-right">
            <span className="text-sm font-black" style={{ color: '#F59E0B' }}>{alerts.length} تنبيه تغيير OU</span>
            <span className="text-xs text-secondary mr-2">— موظفون مجدولون في فرع مختلف عن تكليفهم</span>
          </div>
          <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
        </button>
        <button onClick={onGoToChangeOU}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
          style={{ background: '#F59E0B20', color: '#F59E0B' }}>
          <Repeat2 size={11} /> سجل تغيير OU
        </button>
      </div>
      {open && (
        <div className="border-t divide-y" style={{ borderColor: '#F59E0B20', direction: 'rtl' }}>
          {alerts.map(al => {
            const emp = empMap[al.entry.employeeId]
            const cur = branchMap[al.currentBranchId ?? '']
            const sch = branchMap[al.scheduledBranchId]
            const ds  = new Date(al.entry.date + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
            return (
              <div key={al.entry.id} className="px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary">{emp ? getEmpName(emp) : '—'}<span className="font-normal text-secondary"> · {ds}</span></p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    من: <span className="font-semibold mx-1" style={{ color: '#DC2626' }}>{cur?.storeName ?? '—'}</span>
                    إلى: <span className="font-semibold mx-1" style={{ color: '#059669' }}>{sch?.storeName ?? '—'}</span>
                    <span className="font-black mr-2" style={{ color: '#F59E0B' }}>← مطلوب تغيير OU</span>
                  </p>
                </div>
                <button
                  onClick={() => onCreateCOU({
                    userAccount:    emp?.user || emp?.domainName || '',
                    accountName:    emp ? getEmpName(emp) : '',
                    email:          (emp as any)?.email || '',
                    mobile:         (emp as any)?.mobile || '',
                    idNumber:       (emp as any)?.nationalId || '',
                    employeeNumber: emp?.employeeCode || '',
                    oldOU:          cur ? (cur.storeNameAr || cur.storeName) : '',
                    oldOUCode:      cur?.ou || '',
                    newOU:          sch ? (sch.storeNameAr || sch.storeName) : '',
                    newOUCode:      sch?.ou || '',
                  })}
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                  style={{ background: '#F59E0B20', color: '#F59E0B', whiteSpace: 'nowrap' }}>
                  <Repeat2 size={10} /> إنشاء OU
                </button>
              </div>
            )
          })}
        </div>
      )}
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
                      const cs = entry ? cellStyle(entry, branch?.storeNameAr || branch?.storeName) : { bg: 'transparent', fg: '#4b5563', label: '', sub: undefined }
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

// ── List view ─────────────────────────────────────────────────────────────

function ListView({ entries, employees, branches, onEdit, onDelete }: {
  entries:   ScheduleEntry[]
  employees: ReturnType<typeof useSchedule>['employees']
  branches:  ReturnType<typeof useSchedule>['branches']
  onEdit:    (e: ScheduleEntry) => void
  onDelete:  (id: string) => void
}) {
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))
  const today     = todayStr()
  const sorted    = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const typeLabel: Record<ScheduleCellType, string> = { branch: 'فرع', off: 'راحة', annual: 'سنوي', sick: 'مريض', visit: 'زيارة', note: 'ملاحظة', empty: '—' }
  if (!sorted.length) return (
    <div className="card p-12 text-center"><CalendarDays size={38} className="text-tertiary mx-auto mb-3" strokeWidth={1.4} /><p className="text-secondary font-semibold text-sm">لا توجد مناوبات</p></div>
  )
  return (
    <div className="card overflow-hidden">
      <div className="table-scroll">
        <table className="we-table w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="text-right">التاريخ</th><th className="text-right">الموظف</th>
              <th className="text-right">النوع</th><th className="text-right">الفرع</th>
              <th className="text-right">الوقت</th><th className="text-right">ملاحظة</th>
              <th className="text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(e => {
              const emp = empMap[e.employeeId], branch = e.branchId ? branchMap[e.branchId] : null
              return (
                <tr key={e.id} style={{ opacity: e.date < today ? 0.55 : 1 }}>
                  <td><span className="num text-xs font-semibold text-secondary">{new Date(e.date+'T00:00:00').toLocaleDateString('ar-EG',{weekday:'short',day:'numeric',month:'short'})}</span></td>
                  <td><span className="font-semibold text-primary text-sm">{emp ? getEmpName(emp) : '—'}</span></td>
                  <td><span className="text-xs text-secondary">{typeLabel[e.cellType??'branch']}</span></td>
                  <td><span className="text-xs text-secondary">{branch?(branch.storeNameAr||branch.storeName):'—'}</span></td>
                  <td><span className="text-xs text-tertiary num">{e.startTime?`${e.startTime}${e.endTime?`–${e.endTime}`:''}` :'—'}</span></td>
                  <td><span className="text-xs text-tertiary">{e.note||'—'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(e)} className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => onDelete(e.id)} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Change OU Modal ───────────────────────────────────────────────────────

const EMPTY_COU: ChangeOUInput = {
  userAccount: '', accountName: '', email: '', mobile: '', idNumber: '',
  ...COU_DEFAULTS, oldOU: '', newOU: '',
  oldOUCode: '', newOUCode: '', employeeNumber: '', note: '',
}

function ChangeOUModal({ editing, branches, employees, preset, onClose, onSave, onDelete }: {
  editing:    ChangeOURecord | null
  branches:   ReturnType<typeof useSchedule>['branches']
  employees:  ReturnType<typeof useSchedule>['employees']
  preset?:    Partial<ChangeOUInput>
  onClose:    () => void
  onSave:     (input: ChangeOUInput) => void
  onDelete?:  () => void
}) {
  const [form, setForm] = useState<ChangeOUInput>(
    editing ? { ...editing } : { ...EMPTY_COU, ...preset }
  )
  const [, setEmpSearch] = useState(form.userAccount || '')

  function f(k: keyof ChangeOUInput, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function fillFromEmployee(empId: string) {
    const emp = employees.find(e => e.id === empId || e.employeeCode === empId)
    if (!emp) return
    setForm(p => ({
      ...p,
      userAccount:    emp.user || emp.domainName || '',
      accountName:    getEmpName(emp),
      email:          (emp as any).email || '',
      mobile:         (emp as any).mobile || '',
      idNumber:       (emp as any).nationalId || '',
      employeeNumber: emp.employeeCode || '',
    }))
    setEmpSearch(emp.employeeCode + ' ' + getEmpName(emp))
  }
  function selectOU(type: 'old' | 'new', name: string) {
    const br = branches.find(b => (b.storeNameAr || b.storeName) === name)
    if (type === 'old') setForm(p => ({ ...p, oldOU: name, oldOUCode: br?.ou ?? p.oldOUCode }))
    else                setForm(p => ({ ...p, newOU: name, newOUCode: br?.ou ?? p.newOUCode }))
  }
  const branchNames = branches.map(b => b.storeNameAr || b.storeName)
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-bold text-secondary mb-1">{children}</label>
  )
  const Inp = ({ k, placeholder, type = 'text' }: { k: keyof ChangeOUInput; placeholder?: string; type?: string }) => (
    <input type={type} value={form[k]} onChange={e => f(k, e.target.value)}
      placeholder={placeholder} className="we-input text-xs" />
  )
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-2 mt-4">{title}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
              <Repeat2 size={14} style={{ color: WE }} />
            </div>
            <h2 className="text-sm font-black text-primary">{editing ? 'تعديل سجل تغيير OU' : 'إضافة سجل تغيير OU'}</h2>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && <button onClick={onDelete} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>}
            <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors"><X size={16} /></button>
          </div>
        </div>
        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto p-5" style={{ direction: 'rtl' }}>
          {/* Quick employee fill */}
          {!editing && (
            <div className="mb-4 p-3 rounded-xl" style={{ background: `${WE}10`, border: `1px solid ${WE}22` }}>
              <p className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-2">تعبئة تلقائية من الموظف</p>
              <div className="flex gap-2">
                <select className="we-input text-xs flex-1"
                  value="" onChange={e => e.target.value && fillFromEmployee(e.target.value)}>
                  <option value="">اختر موظف للتعبئة التلقائية...</option>
                  {employees.sort((a,b)=>+a.employeeCode - +b.employeeCode).map(e => (
                    <option key={e.id} value={e.id}>{e.employeeCode} — {getEmpName(e)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <Section title="بيانات الموظف">
            <div><Label>User Account *</Label><Inp k="userAccount" placeholder="Ahmed.Zaref" /></div>
            <div><Label>الاسم الكامل *</Label><Inp k="accountName" placeholder="Ahmed Zarief Mohamed" /></div>
            <div><Label>رقم الهوية</Label><Inp k="idNumber" placeholder="29405282400838" /></div>
            <div><Label>رقم العامل</Label><Inp k="employeeNumber" placeholder="9070" /></div>
            <div><Label>الجوال</Label><Inp k="mobile" placeholder="01xxxxxxxxx" /></div>
            <div><Label>البريد الإلكتروني</Label><Inp k="email" placeholder="name@te.eg" /></div>
            <div className="col-span-2"><Label>المسمى الوظيفي (Role Name)</Label><Inp k="roleName" /></div>
          </Section>

          <Section title="تغيير الفرع">
            <div>
              <Label>الفرع القديم (Old OU) *</Label>
              <select value={form.oldOU} onChange={e => selectOU('old', e.target.value)} className="we-input text-xs">
                <option value="">اختر الفرع</option>
                {branchNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>الفرع الجديد (New OU) *</Label>
              <select value={form.newOU} onChange={e => selectOU('new', e.target.value)} className="we-input text-xs">
                <option value="">اختر الفرع</option>
                {branchNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><Label>Old OU Code</Label><Inp k="oldOUCode" placeholder="wS09Bi010921" /></div>
            <div><Label>New OU Code</Label><Inp k="newOUCode" placeholder="wS08Bb010921" /></div>
            <div className="col-span-2"><Label>Cash Box Closed</Label><Inp k="cashBoxClosed" /></div>
          </Section>

          <Section title="الإدارة">
            <div><Label>المدير المباشر</Label><Inp k="directManager" placeholder="Raouf Emeel" /></div>
            <div><Label>ايميل المدير</Label><Inp k="managerEmail" placeholder="raouf.emeel@te.eg" /></div>
            <div className="col-span-2"><Label>Division</Label><Inp k="division" /></div>
          </Section>

          <Section title="الهيكل التنظيمي">
            <div><Label>الادارة</Label><Inp k="department" /></div>
            <div><Label>الادارة العامة</Label><Inp k="generalDept" /></div>
            <div><Label>القطاع</Label><Inp k="sector" /></div>
            <div><Label>التابعية</Label><Inp k="affiliation" /></div>
          </Section>

          <div className="mt-4">
            <Label>ملاحظة</Label>
            <input value={form.note} onChange={e => f('note', e.target.value)} className="we-input text-xs w-full" placeholder="ملاحظة..." />
          </div>
        </div>
        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0 border-t pt-4" style={{ borderColor: 'var(--border)', direction: 'rtl' }}>
          <button onClick={() => { if (!form.userAccount || !form.oldOU || !form.newOU) { alert('يرجى ملء User Account والفرع القديم والجديد'); return } onSave(form) }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            {editing ? <><Save size={14} />حفظ</> : <><Plus size={14} />إضافة</>}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// ── Change OU view ────────────────────────────────────────────────────────

function ChangeOUView({ records, onAdd, onEdit, onDelete }: {
  records:  ChangeOURecord[]
  onAdd:    () => void
  onEdit:   (r: ChangeOURecord) => void
  onDelete: (id: string) => void
}) {
  function exportAll() {
    if (!records.length) { alert('لا توجد سجلات'); return }
    const rows = records.map(r => ({
      'Type': 'TEData',
      'User Account': r.userAccount,
      'Account Name': r.accountName,
      'Email': r.email,
      'Mobile': r.mobile,
      'ID Number': r.idNumber,
      'Role Name': r.roleName,
      'Old OU': r.oldOU,
      'New OU': r.newOU,
      'Cash Box Closed': r.cashBoxClosed,
      'Direct Manager': r.directManager,
      'Division': r.division,
      'Old OU Code': r.oldOUCode,
      'New OU Code': r.newOUCode,
      'الادارة': r.department,
      'الادارة العامة': r.generalDept,
      'القطاع': r.sector,
      'التابعية': r.affiliation,
      'ايميل المدير المباشر': r.managerEmail,
      'رقم العامل': r.employeeNumber,
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [10,20,28,22,14,18,28,14,14,20,20,20,18,18,30,30,18,14,24,12].map(wch => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, 'Change OU')
    const label = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    XLSX.writeFile(wb, `Change OU - ${label}.xlsx`)
  }

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-primary">سجلات تغيير OU</h2>
          <p className="text-xs text-secondary mt-0.5">{records.length} سجل مسجل</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)' }}>
            <Download size={12} /> تصدير Excel
          </button>
          <button onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            <Plus size={12} /> إضافة
          </button>
        </div>
      </div>

      {/* Info note */}
      <div className="card p-3 mb-4 flex items-start gap-2" style={{ background: '#F59E0B08', border: '1px solid #F59E0B30' }}>
        <AlertTriangle size={13} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs" style={{ color: '#F59E0B' }}>
          سجل تغيير OU يُستخدم لتوثيق نقل موظف من فرع لآخر. اضغط "تصدير Excel" لإرساله لنظام TEData.
        </p>
      </div>

      {!records.length ? (
        <div className="card p-14 flex flex-col items-center gap-3 text-center">
          <Repeat2 size={40} className="text-tertiary" strokeWidth={1.3} />
          <p className="text-secondary font-semibold text-sm">لا توجد سجلات تغيير OU</p>
          <p className="text-tertiary text-xs">أضف سجلاً جديداً عند نقل موظف من فرع لآخر</p>
          <button onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white mt-2 transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            <Plus size={12} /> إضافة أول سجل
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block table-scroll">
            <table className="we-table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="text-right">رقم العامل</th>
                  <th className="text-right">User Account</th>
                  <th className="text-right">الاسم</th>
                  <th className="text-right">من</th>
                  <th className="text-right">إلى</th>
                  <th className="text-right">المدير</th>
                  <th className="text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td><span className="num text-xs font-bold" style={{ color: WE }}>{r.employeeNumber || '—'}</span></td>
                    <td><span className="text-xs font-mono text-primary">{r.userAccount}</span></td>
                    <td><span className="text-sm font-semibold text-primary">{r.accountName || '—'}</span></td>
                    <td>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(220,38,38,0.12)', color: '#fca5a5' }}>
                        {r.oldOU}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.12)', color: '#86efac' }}>
                        {r.newOU}
                      </span>
                    </td>
                    <td><span className="text-xs text-secondary">{r.directManager || '—'}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(r)} className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => onDelete(r.id)} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
            {records.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-bold text-primary text-sm">{r.accountName || r.userAccount}</p>
                    <p className="text-xs text-secondary font-mono mt-0.5">{r.userAccount}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(r)} className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => onDelete(r.id)} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(220,38,38,0.12)', color: '#fca5a5' }}>{r.oldOU}</span>
                  <span className="text-tertiary">→</span>
                  <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(22,163,74,0.12)', color: '#86efac' }}>{r.newOU}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Analytics view ────────────────────────────────────────────────────────

function AnalyticsView({ entries, employees, branches }: {
  entries:   ReturnType<typeof useSchedule>['entries']
  employees: ReturnType<typeof useSchedule>['employees']
  branches:  ReturnType<typeof useSchedule>['branches']
}) {
  const empMap    = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees])
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])

  // Aggregates: per employee per branch, count of cellTypes
  const stats = useMemo(() => {
    const byEmp: Record<string, {
      totalWork: number; totalOff: number; totalAnnual: number
      totalSick: number; totalVisit: number
      byBranch: Record<string, number>
    }> = {}
    for (const e of entries) {
      if (!byEmp[e.employeeId]) byEmp[e.employeeId] = { totalWork: 0, totalOff: 0, totalAnnual: 0, totalSick: 0, totalVisit: 0, byBranch: {} }
      const s = byEmp[e.employeeId]
      const ct = e.cellType ?? 'branch'
      if (ct === 'branch')  { s.totalWork++; if (e.branchId) s.byBranch[e.branchId] = (s.byBranch[e.branchId] || 0) + 1 }
      if (ct === 'off')     s.totalOff++
      if (ct === 'annual')  s.totalAnnual++
      if (ct === 'sick')    s.totalSick++
      if (ct === 'visit')   { s.totalVisit++; if (e.branchId) s.byBranch[e.branchId] = (s.byBranch[e.branchId] || 0) + 1 }
    }
    return byEmp
  }, [entries])

  // Branch coverage stats
  const branchStats = useMemo(() => {
    const byBr: Record<string, { days: number; employees: Set<string> }> = {}
    for (const e of entries) {
      const ct = e.cellType ?? 'branch'
      if ((ct === 'branch' || ct === 'visit') && e.branchId) {
        if (!byBr[e.branchId]) byBr[e.branchId] = { days: 0, employees: new Set() }
        byBr[e.branchId].days++
        byBr[e.branchId].employees.add(e.employeeId)
      }
    }
    return byBr
  }, [entries])

  const totalWork    = useMemo(() => entries.filter(e => (e.cellType ?? 'branch') === 'branch').length, [entries])
  const totalAnnual  = useMemo(() => entries.filter(e => e.cellType === 'annual').length, [entries])
  const totalSick    = useMemo(() => entries.filter(e => e.cellType === 'sick').length, [entries])
  const totalVisit   = useMemo(() => entries.filter(e => e.cellType === 'visit').length, [entries])
  const totalOff     = useMemo(() => entries.filter(e => e.cellType === 'off').length, [entries])

  function exportExcel() {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Employee stats
    const empRows = employees.map(emp => {
      const s = stats[emp.id]
      if (!s) return { 'الموظف': getEmpName(emp), 'الكود': emp.employeeCode, 'أيام عمل': 0, 'راحة': 0, 'سنوي': 0, 'مريض': 0, 'زيارة': 0 }
      const branchCols: Record<string, number> = {}
      for (const [brId, cnt] of Object.entries(s.byBranch)) {
        const br = branchMap[brId]
        branchCols[br?.storeNameAr || br?.storeName || brId] = cnt
      }
      return { 'الموظف': getEmpName(emp), 'الكود': emp.employeeCode, 'أيام عمل': s.totalWork, 'راحة': s.totalOff, 'سنوي': s.totalAnnual, 'مريض': s.totalSick, 'زيارة': s.totalVisit, ...branchCols }
    })
    const ws1 = XLSX.utils.json_to_sheet(empRows)
    XLSX.utils.book_append_sheet(wb, ws1, 'إحصائيات الموظفين')

    // Sheet 2: Branch stats
    const brRows = branches.map(br => {
      const s = branchStats[br.id]
      return {
        'الفرع': br.storeNameAr || br.storeName,
        'أيام تغطية': s?.days || 0,
        'عدد الموظفين': s?.employees.size || 0,
      }
    })
    const ws2 = XLSX.utils.json_to_sheet(brRows)
    XLSX.utils.book_append_sheet(wb, ws2, 'إحصائيات الفروع')

    XLSX.writeFile(wb, `Schedule Analytics - ${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.xlsx`)
  }

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-black text-primary">تحليلات الجدول</h2>
          <p className="text-xs text-secondary mt-0.5">{entries.length} خلية إجمالاً</p>
        </div>
        <button onClick={exportExcel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)' }}>
          <Download size={12} /> تصدير Excel
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'أيام عمل',  value: totalWork,   bg: `${WE}18`,              color: WE           },
          { label: 'راحة',      value: totalOff,    bg: 'rgba(75,85,99,0.18)',  color: '#9ca3af'    },
          { label: 'سنوي',      value: totalAnnual, bg: 'rgba(245,158,11,0.18)',color: '#fbbf24'    },
          { label: 'مريض',      value: totalSick,   bg: 'rgba(239,68,68,0.18)', color: '#fca5a5'    },
          { label: 'زيارة',     value: totalVisit,  bg: 'rgba(245,158,11,0.14)',color: '#fcd34d'    },
        ].map(k => (
          <div key={k.label} className="card p-4 text-center" style={{ background: k.bg, border: `1px solid ${k.color}22` }}>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-secondary mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Employee table */}
      <div className="card overflow-hidden mb-6">
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <BarChart2 size={14} style={{ color: WE }} />
          <h3 className="text-xs font-black text-primary">إحصائيات الموظفين</h3>
        </div>
        <div className="table-scroll">
          <table className="we-table w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="text-right">الموظف</th>
                <th className="text-center">أيام عمل</th>
                <th className="text-center">راحة</th>
                <th className="text-center">سنوي</th>
                <th className="text-center">مريض</th>
                <th className="text-right">توزيع الفروع</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const s = stats[emp.id]
                if (!s && !entries.find(e => e.employeeId === emp.id)) return null
                const totalDays = (s?.totalWork ?? 0) + (s?.totalOff ?? 0) + (s?.totalAnnual ?? 0) + (s?.totalSick ?? 0)
                return (
                  <tr key={emp.id}>
                    <td>
                      <p className="font-bold text-primary text-sm">{getEmpName(emp)}</p>
                      <p className="text-[10px] text-secondary font-mono">{emp.employeeCode}</p>
                    </td>
                    <td className="text-center">
                      <span className="font-black text-sm" style={{ color: WE }}>{s?.totalWork ?? 0}</span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm text-secondary">{s?.totalOff ?? 0}</span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm" style={{ color: '#fbbf24' }}>{s?.totalAnnual ?? 0}</span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm" style={{ color: '#fca5a5' }}>{s?.totalSick ?? 0}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(s?.byBranch ?? {}).sort((a,b)=>b[1]-a[1]).map(([brId, cnt]) => {
                          const br = branchMap[brId]
                          const style = BRANCH_CELL[brId]
                          const pct = totalDays > 0 ? Math.round(cnt / totalDays * 100) : 0
                          return (
                            <span key={brId} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: style?.bg ?? `${WE}18`, color: style?.fg ?? WE }}>
                              {br?.storeNameAr || br?.storeName || brId}: {cnt}د ({pct}%)
                            </span>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Branch coverage table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <BarChart2 size={14} style={{ color: WE }} />
          <h3 className="text-xs font-black text-primary">تغطية الفروع</h3>
        </div>
        <div className="table-scroll">
          <table className="we-table w-full">
            <thead>
              <tr>
                <th className="text-right">الفرع</th>
                <th className="text-center">أيام التغطية</th>
                <th className="text-center">عدد الموظفين</th>
                <th className="text-right">الموظفون</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(br => {
                const s = branchStats[br.id]
                if (!s) return (
                  <tr key={br.id}>
                    <td><span className="font-semibold text-sm text-primary">{br.storeNameAr || br.storeName}</span></td>
                    <td className="text-center"><span className="text-secondary text-sm">0</span></td>
                    <td className="text-center"><span className="text-secondary text-sm">0</span></td>
                    <td></td>
                  </tr>
                )
                const bStyle = BRANCH_CELL[br.id]
                return (
                  <tr key={br.id}>
                    <td>
                      <span className="font-bold text-sm px-2 py-0.5 rounded-full"
                        style={{ background: bStyle?.bg ?? `${WE}18`, color: bStyle?.fg ?? WE }}>
                        {br.storeNameAr || br.storeName}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="font-black text-sm" style={{ color: bStyle?.fg ?? WE }}>{s.days}</span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm text-secondary">{s.employees.size}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {[...s.employees].map(empId => {
                          const emp = empMap[empId]
                          return emp ? (
                            <span key={empId} className="text-[10px] text-secondary px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-elevated)' }}>
                              {getEmpName(emp)}
                            </span>
                          ) : null
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { employees, branches, entries, alerts, addEntry, updateEntry, deleteEntry, resetEntries, overwriteEntries } = useSchedule()
  const { records: couRecords, addRecord: addCOU, updateRecord: updateCOU, deleteRecord: deleteCOU } = useChangeOU()

  const [year,  setYear]  = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [view,  setView]  = useState<'matrix' | 'list' | 'changeou' | 'analytics'>('matrix')

  // Entry modal
  const [modal,         setModal]         = useState(false)
  const [editing,       setEditing]       = useState<ScheduleEntry | null>(null)
  const [fixedEmployee, setFixedEmployee] = useState<string | null>(null)
  const [fixedDate,     setFixedDate]     = useState<string | null>(null)
  const [importModal,   setImportModal]   = useState(false)

  // Change OU modal
  const [couModal,   setCouModal]   = useState(false)
  const [editingCOU, setEditingCOU] = useState<ChangeOURecord | null>(null)
  const [couPreset,  setCouPreset]  = useState<Partial<ChangeOUInput> | undefined>(undefined)

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')

  const days = useMemo(() => getDaysInMonth(year, month), [year, month])

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

  // Filtered entries for list view
  const filteredListEntries = useMemo(() => entries.filter(e => {
    if (filterSearch.trim()) {
      const emp = employees.find(x => x.id === e.employeeId)
      if (!emp) return false
      const q = filterSearch.toLowerCase()
      if (!getEmpName(emp).toLowerCase().includes(q) && !emp.employeeCode.toLowerCase().includes(q) && !(emp.user||'').toLowerCase().includes(q)) return false
    }
    if (filterBranch && e.branchId !== filterBranch) return false
    if (filterFrom && e.date < filterFrom) return false
    if (filterTo   && e.date > filterTo)   return false
    return true
  }), [entries, employees, filterSearch, filterBranch, filterFrom, filterTo])

  function openAdd()                                 { setEditing(null); setFixedEmployee(null); setFixedDate(null); setModal(true) }
  function openAddFromCell(empId: string, date: string) { setEditing(null); setFixedEmployee(empId); setFixedDate(date); setModal(true) }
  function openEdit(e: ScheduleEntry)               { setEditing(e); setFixedEmployee(null); setFixedDate(null); setModal(true) }
  function closeModal()                             { setModal(false); setEditing(null); setFixedEmployee(null); setFixedDate(null) }
  function handleSave(input: ScheduleInput)         { if (editing) updateEntry(editing.id, input); else addEntry(input); closeModal() }
  function handleDelete()                           { if (!editing) return; if (window.confirm('حذف هذه الخلية؟')) { deleteEntry(editing.id); closeModal() } }
  function handleCellClick(empId: string, date: string, entry: ScheduleEntry | null) { if (entry) openEdit(entry); else openAddFromCell(empId, date) }
  function handleDeleteFromList(id: string)         { if (window.confirm('حذف هذه المناوبة؟')) deleteEntry(id) }
  function prevMonth() { if (month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1) }
  function nextMonth() { if (month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1) }

  function handleCOUSave(input: ChangeOUInput) { if (editingCOU) updateCOU(editingCOU.id, input); else addCOU(input); setCouModal(false); setEditingCOU(null); setCouPreset(undefined) }
  function handleCOUDelete() { if (!editingCOU) return; if (window.confirm('حذف هذا السجل؟')) { deleteCOU(editingCOU.id); setCouModal(false); setEditingCOU(null); setCouPreset(undefined) } }
  function openCOUFromAlert(preset: Partial<ChangeOUInput>) { setCouPreset(preset); setEditingCOU(null); setCouModal(true) }

  const monthLabel   = new Date(year, month - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
  const todayDisplay = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const LEGEND = [
    { label: 'راحة',   bg: 'rgba(75,85,99,0.28)',   fg: '#9ca3af' },
    { label: 'سنوي',   bg: 'rgba(245,158,11,0.22)', fg: '#fbbf24' },
    { label: 'مريض',   bg: 'rgba(239,68,68,0.22)',  fg: '#fca5a5' },
    { label: 'زيارة',  bg: 'rgba(245,158,11,0.18)', fg: '#fcd34d' },
    { label: 'ملاحظة', bg: 'rgba(107,33,168,0.18)', fg: '#c4b5fd' },
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

      <AlertBanner alerts={alerts} employees={employees} branches={branches} onGoToChangeOU={() => setView('changeou')} onCreateCOU={openCOUFromAlert} />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          {([['matrix','مصفوفة'],['list','قائمة'],['analytics','تحليلات'],['changeou','تغيير OU']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={view === v ? { background: WE, color: '#fff' } : { color: 'var(--text-secondary)' }}>
              {v === 'changeou' && <Repeat2 size={11} />}
              {v === 'analytics' && <BarChart2 size={11} />}
              {label}
              {v === 'changeou' && couRecords.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: view === 'changeou' ? 'rgba(255,255,255,0.2)' : `${WE}20`, color: view === 'changeou' ? '#fff' : WE }}>
                  {couRecords.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Month nav (matrix / list) */}
        {view !== 'changeou' && view !== 'analytics' && (
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors"><ChevronRight size={16} /></button>
            <button onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()+1) }}
              className="px-3 py-1 rounded-lg text-xs font-semibold hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>
              هذا الشهر
            </button>
            <span className="text-sm font-black text-primary">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors"><ChevronLeft size={16} /></button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      {view !== 'changeou' && view !== 'analytics' && (
        <FilterBar
          search={filterSearch} branch={filterBranch} dateFrom={filterFrom} dateTo={filterTo}
          branches={branches}
          onSearch={setFilterSearch} onBranch={setFilterBranch}
          onDateFrom={setFilterFrom} onDateTo={setFilterTo}
          onClear={() => { setFilterSearch(''); setFilterBranch(''); setFilterFrom(''); setFilterTo('') }}
        />
      )}

      {/* Legend (matrix) */}
      {view === 'matrix' && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {LEGEND.map(l => (
            <span key={l.label} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: l.bg, color: l.fg }}>
              {l.label}
            </span>
          ))}
        </div>
      )}

      {/* Main content */}
      {view === 'changeou' ? (
        <ChangeOUView
          records={couRecords}
          onAdd={() => { setEditingCOU(null); setCouModal(true) }}
          onEdit={r => { setEditingCOU(r); setCouModal(true) }}
          onDelete={id => { if (window.confirm('حذف هذا السجل؟')) deleteCOU(id) }}
        />
      ) : view === 'analytics' ? (
        <AnalyticsView entries={entries} employees={employees} branches={branches} />
      ) : (
        <div className="card overflow-hidden">
          {view === 'matrix'
            ? <MatrixGrid days={filteredDays} employees={filteredEmployees} branches={branches} entries={monthEntries} onCellClick={handleCellClick} />
            : <ListView   entries={filteredListEntries} employees={employees} branches={branches} onEdit={openEdit} onDelete={handleDeleteFromList} />
          }
        </div>
      )}

      {/* Reset */}
      {entries.length > 0 && view !== 'changeou' && view !== 'analytics' && (
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
          onClose={closeModal} onSave={handleSave}
          onDelete={editing ? handleDelete : undefined} />
      )}

      {/* Import modal */}
      {importModal && (
        <ImportModal employees={employees} onClose={() => setImportModal(false)}
          onApply={(ents, dates) => overwriteEntries(ents, dates)} />
      )}

      {/* Change OU modal */}
      {couModal && (
        <ChangeOUModal
          editing={editingCOU} branches={branches} employees={employees} preset={couPreset}
          onClose={() => { setCouModal(false); setEditingCOU(null); setCouPreset(undefined) }}
          onSave={handleCOUSave}
          onDelete={editingCOU ? handleCOUDelete : undefined}
        />
      )}
    </div>
  )
}
