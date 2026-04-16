import { useState } from 'react'
import { CalendarOff, Plus, Save, X, Trash2, Pencil, Users, CalendarDays } from 'lucide-react'
import { useWorkingDayOff } from '@/hooks/useWorkingDayOff'
import { useLanguage }      from '@/context/LanguageContext'
import { getEmpName }       from '@/data/seedData'
import type { WorkingDayOffRecord } from '@/types/hr'
import type { WorkingDayOffInput }  from '@/hooks/useWorkingDayOff'

const WE = '#6B21A8'
const ORANGE = '#F97316'

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── KPI ───────────────────────────────────────────────────────────────────

function KPICards({ kpi }: { kpi: ReturnType<typeof useWorkingDayOff>['kpi'] }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">إجمالي الأيام المسجلة</p>
        <p className="text-2xl font-black num" style={{ color: ORANGE }}>{kpi.totalRecords}</p>
        <p className="text-xs text-tertiary mt-0.5">يوم عمل في إجازة</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">موظفون عملوا في إجازة</p>
        <p className="text-2xl font-black num" style={{ color: WE }}>{kpi.uniqueWorkers}</p>
        <p className="text-xs text-tertiary mt-0.5">موظف هذه السنة</p>
      </div>
    </div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────

function WorkingDayOffForm({
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
  const [date,       setDate]       = useState(editing?.date       ?? todayStr())
  const [note,       setNote]       = useState(editing?.note       ?? '')

  const isEdit = !!editing

  function reset() {
    setEmployeeId(''); setBranchId(''); setDate(todayStr()); setNote('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !branchId || !date) return
    onSubmit({ employeeId, branchId, date, note })
    if (!isEdit) reset()
  }

  return (
    <div className="we-form-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${ORANGE}16` }}>
            <CalendarOff size={15} style={{ color: ORANGE }} />
          </div>
          <h3 className="text-sm font-bold text-primary">
            {isEdit ? 'تعديل السجل' : 'تسجيل عمل في الإجازة'}
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
            الموظف <span className="text-red-500">*</span>
          </label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="we-input" required>
            <option value="">اختر الموظف</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{getEmpName(emp)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الفرع <span className="text-red-500">*</span>
          </label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input" required>
            <option value="">اختر الفرع</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {lang === 'ar' ? (b.storeNameAr || b.storeName) : b.storeName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            التاريخ <span className="text-red-500">*</span>
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" required />
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">ملاحظة / السبب</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="سبب العمل في الإجازة..." className="we-input" maxLength={200} />
        </div>

        <button type="submit"
          disabled={!employeeId || !branchId || !date}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg,${ORANGE},#EA580C)` }}>
          {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />تسجيل اليوم</>}
        </button>
      </form>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────

function WorkingDayOffTable({
  records, employees, branches, onEdit, onDelete,
}: {
  records:   WorkingDayOffRecord[]
  employees: ReturnType<typeof useWorkingDayOff>['employees']
  branches:  ReturnType<typeof useWorkingDayOff>['branches']
  onEdit:    (r: WorkingDayOffRecord) => void
  onDelete:  (id: string) => void
}) {
  const { lang } = useLanguage()
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))

  if (records.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center gap-3 text-center">
        <CalendarOff size={38} className="text-tertiary" strokeWidth={1.4} />
        <p className="text-secondary font-semibold text-sm">لا توجد سجلات عمل في الإجازة</p>
        <p className="text-tertiary text-xs">ابدأ بإضافة أول سجل من النموذج</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Mobile */}
      <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
        {records.map(rec => {
          const emp    = empMap[rec.employeeId]
          const branch = branchMap[rec.branchId]
          return (
            <div key={rec.id} className="p-4">
              <p className="font-bold text-primary text-sm mb-1">{emp ? getEmpName(emp) : '—'}</p>
              <p className="text-xs text-secondary">{fmtDate(rec.date)}</p>
              {branch && (
                <p className="text-xs text-tertiary">
                  {lang === 'ar' ? (branch.storeNameAr || branch.storeName) : branch.storeName}
                </p>
              )}
              {rec.note && <p className="text-xs text-tertiary italic mt-1 truncate">{rec.note}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => onEdit(rec)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ color: ORANGE, background: `${ORANGE}12` }}>
                  <Pencil size={12} /> تعديل
                </button>
                <button onClick={() => onDelete(rec.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>
                  <Trash2 size={12} /> حذف
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop */}
      <div className="hidden md:block table-scroll">
        <table className="we-table w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="text-right">الموظف</th>
              <th className="text-right">التاريخ</th>
              <th className="text-right">الفرع</th>
              <th className="text-right">ملاحظة</th>
              <th className="text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {records.map(rec => {
              const emp    = empMap[rec.employeeId]
              const branch = branchMap[rec.branchId]
              return (
                <tr key={rec.id}>
                  <td><span className="font-semibold text-primary text-sm">{emp ? getEmpName(emp) : '—'}</span></td>
                  <td><span className="num text-xs text-secondary">{fmtDate(rec.date)}</span></td>
                  <td>
                    <span className="text-xs text-secondary">
                      {branch ? (lang === 'ar' ? (branch.storeNameAr || branch.storeName) : branch.storeName) : '—'}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-tertiary" title={rec.note || undefined}>
                      {rec.note ? (rec.note.length > 30 ? rec.note.slice(0, 30) + '…' : rec.note) : '—'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(rec)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-orange-400 hover:bg-orange-500/10 transition-colors" title="تعديل">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(rec.id)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors" title="حذف">
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
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function WorkingDayOffPage() {
  const { employees, branches, records, summaries, kpi, addRecord, updateRecord, deleteRecord } =
    useWorkingDayOff()

  const [editing, setEditing] = useState<WorkingDayOffRecord | null>(null)

  function handleSubmit(data: WorkingDayOffInput) {
    if (editing) { updateRecord(editing.id, data); setEditing(null) }
    else         addRecord(data)
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذا السجل؟')) deleteRecord(id)
  }

  const year = new Date().getFullYear()
  const activeWorkers = summaries.filter(s => s.daysCount > 0)

  return (
    <div style={{ direction: 'rtl' }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${ORANGE}1A` }}>
              <CalendarOff size={16} color={ORANGE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">العمل في الإجازة</h1>
          </div>
          <p className="text-sm text-secondary">تسجيل أيام العمل خلال فترة الإجازة · سنة {year}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${ORANGE},#EA580C)` }}>
          <CalendarOff size={12} />
          <span>{records.length} سجل</span>
        </div>
      </div>

      <KPICards kpi={kpi} />

      {/* Active workers summary */}
      {activeWorkers.length > 0 && (
        <div className="card overflow-hidden mb-5">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <Users size={14} style={{ color: ORANGE }} />
            <h2 className="text-sm font-bold text-primary">الموظفون الذين عملوا في الإجازة</h2>
          </div>
          <div className="table-scroll">
            <table className="we-table w-full min-w-[360px]">
              <thead>
                <tr>
                  <th className="text-right">الموظف</th>
                  <th className="text-right">
                    <span className="flex items-center gap-1.5"><CalendarDays size={12} />عدد الأيام</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeWorkers.map(s => (
                  <tr key={s.employee.id}>
                    <td><span className="font-semibold text-primary text-sm">{getEmpName(s.employee)}</span></td>
                    <td><span className="num font-black" style={{ color: ORANGE }}>{s.daysCount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <div className="lg:self-start lg:sticky lg:top-[72px]">
          <WorkingDayOffForm
            employees={employees} branches={branches}
            editing={editing} onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-primary">سجلات العمل في الإجازة</h2>
            <span className="text-xs text-tertiary">{records.length} سجل إجمالي</span>
          </div>
          <WorkingDayOffTable
            records={records} employees={employees} branches={branches}
            onEdit={r => { setEditing(r); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}
