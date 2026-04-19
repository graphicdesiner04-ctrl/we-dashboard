// ── Working in Day Off ────────────────────────────────────────────────────
// Emergency coverage: employee covers for an absent colleague.
// At month end → export Excel sheet to company for financial compensation.

import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  CalendarOff, Plus, Save, X, Pencil, Trash2, Download, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useWorkingDayOff }   from '@/hooks/useWorkingDayOff'
import { useLanguage }         from '@/context/LanguageContext'
import { getEmpName }          from '@/data/seedData'
import type { WorkingDayOffRecord } from '@/types/hr'
import type { WorkingDayOffInput }  from '@/hooks/useWorkingDayOff'

const WE    = '#6B21A8'
const GREEN = '#16A34A'
const AMBER = '#D97706'

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtDateShort(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
}

function monthLabel(key: string) {
  return new Date(key + '-01T00:00:00').toLocaleString('ar-EG', { month: 'long', year: 'numeric' })
}

// ── Month options ─────────────────────────────────────────────────────────

function getMonthOptions() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
      labelEn: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    }
  })
}

// ── KPI cards ─────────────────────────────────────────────────────────────

function KPICards({ kpi }: { kpi: ReturnType<typeof useWorkingDayOff>['kpi'] }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">إجمالي هذه السنة</p>
        <p className="text-2xl font-black num" style={{ color: WE }}>{kpi.totalRecords}</p>
        <p className="text-xs text-tertiary mt-0.5">يوم تغطية</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">موظفون شاركوا</p>
        <p className="text-2xl font-black num" style={{ color: AMBER }}>{kpi.uniqueWorkers}</p>
        <p className="text-xs text-tertiary mt-0.5">موظف هذه السنة</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">هذا الشهر</p>
        <p className="text-2xl font-black num" style={{ color: GREEN }}>{kpi.thisMonthCount}</p>
        <p className="text-xs text-tertiary mt-0.5">يوم تغطية</p>
      </div>
    </div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────

function DayOffForm({
  employees, branches, editing, onSubmit, onCancel,
}: {
  employees: ReturnType<typeof useWorkingDayOff>['employees']
  branches:  ReturnType<typeof useWorkingDayOff>['branches']
  editing:   WorkingDayOffRecord | null
  onSubmit:  (data: WorkingDayOffInput) => void
  onCancel:  () => void
}) {
  const { lang } = useLanguage()
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '')
  const [branchId,   setBranchId]   = useState(editing?.branchId   ?? '')
  const [date,       setDate]       = useState(editing?.date        ?? todayStr())
  const [note,       setNote]       = useState(editing?.note        ?? '')

  const isEdit = !!editing

  function reset() {
    setEmployeeId(''); setBranchId(''); setDate(todayStr()); setNote('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !date || !branchId) return
    onSubmit({ employeeId, branchId, date, note })
    if (!isEdit) reset()
  }

  return (
    <div className="we-form-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
            <CalendarOff size={15} style={{ color: WE }} />
          </div>
          <h3 className="text-sm font-bold text-primary">
            {isEdit ? 'تعديل السجل' : 'تسجيل يوم تغطية'}
          </h3>
        </div>
        {isEdit && (
          <button type="button" onClick={onCancel}
            className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الموظف المغطي <span className="text-red-500">*</span>
          </label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
            className="we-input" required>
            <option value="">اختر الموظف</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{getEmpName(emp)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            التاريخ <span className="text-red-500">*</span>
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="we-input" required />
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الفرع <span className="text-red-500">*</span>
          </label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            className="we-input" required>
            <option value="">اختر الفرع</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {lang === 'ar' ? (b.storeNameAr || b.storeName) : b.storeName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">السبب / ملاحظة</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="سبب التغطية أو ملاحظة..." className="we-input" maxLength={300} />
        </div>

        <button type="submit"
          disabled={!employeeId || !date || !branchId}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />تسجيل اليوم</>}
        </button>
      </form>
    </div>
  )
}

// ── Export panel ──────────────────────────────────────────────────────────

function ExportPanel({
  records, employees, branches,
}: {
  records:   WorkingDayOffRecord[]
  employees: ReturnType<typeof useWorkingDayOff>['employees']
  branches:  ReturnType<typeof useWorkingDayOff>['branches']
}) {
  const monthOpts = getMonthOptions()
  const [exportMonth, setExportMonth] = useState(monthOpts[0].value)

  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))

  function handleExport() {
    const filtered = records.filter(r => r.date.startsWith(exportMonth))
    if (!filtered.length) { alert('لا توجد سجلات في هذا الشهر'); return }

    const grouped: Record<string, WorkingDayOffRecord[]> = {}
    filtered.forEach(r => {
      if (!grouped[r.employeeId]) grouped[r.employeeId] = []
      grouped[r.employeeId].push(r)
    })

    const rows = Object.entries(grouped).map(([empId, recs]) => {
      const emp = empMap[empId]
      const days = recs.map(r => fmtDateShort(r.date)).join(', ')
      const branchNames = [...new Set(
        recs.map(r => {
          const b = branchMap[r.branchId]
          return b ? (b.storeNameAr || b.storeName) : r.branchId
        })
      )].join(', ')
      const reasons = recs.map(r => r.note).filter(Boolean).join(' / ')
      return {
        'User':        emp?.user        ?? empId,
        'Name':        emp ? getEmpName(emp) : empId,
        'ID':          emp?.nationalId  ?? '',
        'Day':         days,
        'No. of Days': recs.length,
        'Exchange':    branchNames,
        'Reason':      reasons,
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 16 },
      { wch: 32 }, { wch: 12 }, { wch: 24 }, { wch: 42 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Working in Day Off')
    const opt = monthOpts.find(o => o.value === exportMonth)
    XLSX.writeFile(wb, `Working in day off - ${opt?.labelEn ?? exportMonth}.xlsx`)
  }

  return (
    <div className="card p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <Download size={15} style={{ color: GREEN }} className="flex-shrink-0 mt-0.5 sm:mt-0" />
      <span className="text-sm font-bold text-primary flex-shrink-0">تصدير Excel للشركة</span>
      <select value={exportMonth} onChange={e => setExportMonth(e.target.value)}
        className="we-input flex-1 min-w-0 sm:max-w-[200px]">
        {monthOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button onClick={handleExport}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: `linear-gradient(135deg,${GREEN},#15803D)` }}>
        <Download size={13} /> تصدير
      </button>
    </div>
  )
}

// ── Month section ─────────────────────────────────────────────────────────

function MonthSection({
  monthKey, records, employees, branches, onEdit, onDelete,
}: {
  monthKey:  string
  records:   WorkingDayOffRecord[]
  employees: ReturnType<typeof useWorkingDayOff>['employees']
  branches:  ReturnType<typeof useWorkingDayOff>['branches']
  onEdit:    (r: WorkingDayOffRecord) => void
  onDelete:  (id: string) => void
}) {
  const { lang } = useLanguage()
  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const [open, setOpen] = useState(monthKey === currentMonthKey)

  const empMap    = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees])
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])

  const sorted = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)),
    [records],
  )

  const isCurrentMonth = monthKey === currentMonthKey

  return (
    <div className="card overflow-hidden mb-4">
      {/* Month header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 flex items-center gap-3 flex-wrap text-right">
          <span className="font-black text-sm text-primary">{monthLabel(monthKey)}</span>
          {isCurrentMonth && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: WE }}>الشهر الحالي</span>
          )}
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${WE}15`, color: WE }}>
              {records.length} يوم
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(22,163,74,0.12)', color: GREEN }}>
              {new Set(records.map(r => r.employeeId)).size} موظف
            </span>
          </div>
        </div>
        {open
          ? <ChevronUp  size={15} className="text-tertiary flex-shrink-0" />
          : <ChevronDown size={15} className="text-tertiary flex-shrink-0" />
        }
      </button>

      {/* Records list */}
      {open && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Desktop table */}
          <div className="hidden md:block table-scroll">
            <table className="we-table w-full min-w-[580px]">
              <thead>
                <tr>
                  <th className="text-right">الموظف</th>
                  <th className="text-right">التاريخ</th>
                  <th className="text-right">الفرع</th>
                  <th className="text-right">الكومنت / السبب</th>
                  <th className="text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(rec => {
                  const emp    = empMap[rec.employeeId]
                  const branch = branchMap[rec.branchId]
                  return (
                    <tr key={rec.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}>
                            {emp ? getEmpName(emp).charAt(0) : '?'}
                          </div>
                          <span className="font-semibold text-primary text-sm">
                            {emp ? getEmpName(emp) : '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="num text-xs text-secondary">{fmtDate(rec.date)}</span>
                      </td>
                      <td>
                        <span className="text-xs" style={{ color: WE }}>
                          {branch
                            ? (lang === 'ar' ? (branch.storeNameAr || branch.storeName) : branch.storeName)
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-tertiary" title={rec.note || undefined}>
                          {rec.note
                            ? (rec.note.length > 50 ? rec.note.slice(0, 50) + '…' : rec.note)
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => onEdit(rec)}
                            className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                            title="تعديل">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => onDelete(rec.id)}
                            className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="حذف">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
            {sorted.map(rec => {
              const emp    = empMap[rec.employeeId]
              const branch = branchMap[rec.branchId]
              return (
                <div key={rec.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-bold text-primary text-sm">{emp ? getEmpName(emp) : '—'}</p>
                      <p className="text-xs text-secondary num mt-0.5">{fmtDate(rec.date)}</p>
                      {branch && (
                        <p className="text-xs mt-0.5" style={{ color: WE }}>
                          {lang === 'ar' ? (branch.storeNameAr || branch.storeName) : branch.storeName}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => onEdit(rec)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(rec.id)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {rec.note && <p className="text-xs text-tertiary">{rec.note}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function WorkingDayOffPage() {
  const {
    employees, branches, records, currentYearRecords,
    kpi, addRecord, updateRecord, deleteRecord,
  } = useWorkingDayOff()

  const [editing, setEditing] = useState<WorkingDayOffRecord | null>(null)

  function handleSubmit(data: WorkingDayOffInput) {
    if (editing) { updateRecord(editing.id, data); setEditing(null) }
    else          addRecord(data)
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذا السجل؟')) deleteRecord(id)
  }

  // Group all records by month, newest first
  const monthBuckets = useMemo(() => {
    const map = new Map<string, WorkingDayOffRecord[]>()
    for (const rec of records) {
      const key = rec.date.slice(0, 7)
      const arr = map.get(key) ?? []
      arr.push(rec)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [records])

  const year = new Date().getFullYear()

  return (
    <div style={{ direction: 'rtl' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${WE}1A` }}>
              <CalendarOff size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">العمل في يوم الإجازة</h1>
          </div>
          <p className="text-sm text-secondary">
            تغطية طارئة · التصدير للشركة في نهاية الشهر · سنة {year}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <CalendarOff size={12} />
          <span>{currentYearRecords.length} سجل</span>
        </div>
      </div>

      <KPICards kpi={kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">

        {/* Left: form */}
        <div className="lg:self-start lg:sticky lg:top-[72px]">
          <DayOffForm
            employees={employees} branches={branches}
            editing={editing} onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>

        {/* Right: export + monthly sections */}
        <div className="min-w-0">
          <ExportPanel records={records} employees={employees} branches={branches} />

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-primary">السجلات حسب الشهر</h2>
            <span className="text-xs text-tertiary">{records.length} سجل إجمالي</span>
          </div>

          {monthBuckets.length === 0 ? (
            <div className="card p-12 flex flex-col items-center gap-3 text-center">
              <CalendarOff size={38} className="text-tertiary" strokeWidth={1.4} />
              <p className="text-secondary font-semibold text-sm">لا توجد سجلات تغطية</p>
              <p className="text-tertiary text-xs">ابدأ بتسجيل أول يوم تغطية من النموذج</p>
            </div>
          ) : (
            monthBuckets.map(([key, recs]) => (
              <MonthSection
                key={key}
                monthKey={key}
                records={recs}
                employees={employees}
                branches={branches}
                onEdit={r => { setEditing(r); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
