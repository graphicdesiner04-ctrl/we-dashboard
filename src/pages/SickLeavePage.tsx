import { useState, useMemo } from 'react'
import { HeartPulse, Plus, Save, X, Trash2, Pencil, AlertCircle } from 'lucide-react'
import { useSickLeave } from '@/hooks/useSickLeave'
import { useAuth }       from '@/context/AuthContext'
import { filterByViewRole } from '@/lib/roleFilter'
import { getEmpName }   from '@/data/seedData'
import type { SickLeaveRecord } from '@/types/hr'
import type { SickLeaveInput }  from '@/hooks/useSickLeave'

const WE = '#6B21A8'

// ── Helpers ───────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── KPI Cards ─────────────────────────────────────────────────────────────

function KPICards({ kpi }: { kpi: { totalEmployees: number; totalDaysUsed: number; employeesUsed: number } }) {
  const cards = [
    { label: 'إجمالي الموظفين', value: kpi.totalEmployees, sub: 'موظف في النظام' },
    { label: 'إجمالي أيام المرضى', value: kpi.totalDaysUsed, sub: 'يوم هذه السنة' },
    { label: 'موظفون استخدموا المرضى', value: kpi.employeesUsed, sub: `من ${kpi.totalEmployees} موظف` },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-secondary mb-1">{c.label}</p>
          <p className="text-2xl font-black text-primary num">{c.value}</p>
          <p className="text-xs text-tertiary mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────

function SickLeaveForm({
  employees, branches, editing, onSubmit, onCancel, daysBetween,
}: {
  employees: ReturnType<typeof useSickLeave>['employees']
  branches:  ReturnType<typeof useSickLeave>['branches']
  editing:   SickLeaveRecord | null
  onSubmit:  (data: SickLeaveInput) => void
  onCancel:  () => void
  daysBetween: (from: string, to: string) => number
}) {
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '')
  const [branchId,   setBranchId]   = useState(editing?.branchId   ?? '')
  const [fromDate,   setFromDate]   = useState(editing?.fromDate    ?? todayStr())
  const [toDate,     setToDate]     = useState(editing?.toDate      ?? todayStr())
  const [note,       setNote]       = useState(editing?.note        ?? '')

  const computed = fromDate && toDate ? daysBetween(fromDate, toDate) : 0
  const isEdit   = !!editing

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !branchId || !fromDate || !toDate) return
    onSubmit({ employeeId, branchId, fromDate, toDate, days: computed, note })
    if (!isEdit) {
      setEmployeeId(''); setBranchId('')
      setFromDate(todayStr()); setToDate(todayStr()); setNote('')
    }
  }

  return (
    <div className="we-form-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
            <HeartPulse size={15} style={{ color: WE }} />
          </div>
          <h3 className="text-sm font-bold text-primary">
            {isEdit ? 'تعديل إجازة مرضية' : 'إضافة إجازة مرضية'}
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
          <label className="block text-xs font-bold text-secondary mb-1">الموظف <span className="text-red-500">*</span></label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="we-input" required>
            <option value="">اختر الموظف</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{getEmpName(emp)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">الفرع <span className="text-red-500">*</span></label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input" required>
            <option value="">اختر الفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.storeName}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">من تاريخ <span className="text-red-500">*</span></label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="we-input" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">إلى تاريخ <span className="text-red-500">*</span></label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="we-input" required />
          </div>
        </div>

        {computed > 0 && (
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl"
            style={{ background: `${WE}0E`, border: `1px solid ${WE}25` }}>
            <span className="text-secondary">عدد الأيام</span>
            <span className="font-black num" style={{ color: WE }}>{computed} يوم</span>
          </div>
        )}

        {fromDate && toDate && toDate < fromDate && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
            style={{ background: '#DC262610', border: '1px solid #DC262625' }}>
            <AlertCircle size={13} style={{ color: '#DC2626' }} />
            <span style={{ color: '#DC2626' }}>تاريخ النهاية قبل البداية</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">ملاحظة</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="سبب الإجازة المرضية..." className="we-input" maxLength={200} />
        </div>

        <button type="submit"
          disabled={!employeeId || !branchId || !fromDate || !toDate || toDate < fromDate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />إضافة الإجازة</>}
        </button>
      </form>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────

function SickLeaveTable({
  records, employees, branches, onEdit, onDelete,
}: {
  records:   SickLeaveRecord[]
  employees: ReturnType<typeof useSickLeave>['employees']
  branches:  ReturnType<typeof useSickLeave>['branches']
  onEdit:    (r: SickLeaveRecord) => void
  onDelete:  (id: string) => void
}) {
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))

  if (records.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center gap-3 text-center">
        <HeartPulse size={38} className="text-tertiary" strokeWidth={1.4} />
        <p className="text-secondary font-semibold text-sm">لا توجد سجلات مرضية</p>
        <p className="text-tertiary text-xs">ابدأ بإضافة أول إجازة مرضية من النموذج</p>
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
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-bold text-primary text-sm">{emp ? getEmpName(emp) : '—'}</p>
                <span className="badge flex-shrink-0" style={{ background: '#DC262610', color: '#DC2626', borderColor: '#DC262625' }}>
                  {rec.days} يوم
                </span>
              </div>
              <p className="text-xs text-tertiary mb-2">{branch?.storeName ?? '—'}</p>
              <p className="text-xs text-secondary num">{fmtDate(rec.fromDate)} → {fmtDate(rec.toDate)}</p>
              {rec.note && <p className="text-xs text-tertiary italic mt-1 truncate">{rec.note}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => onEdit(rec)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ color: WE, background: `${WE}12` }}>
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
        <table className="we-table w-full min-w-[700px]">
          <thead>
            <tr>
              <th className="text-right">الموظف</th>
              <th className="text-right">الفرع</th>
              <th className="text-right">من</th>
              <th className="text-right">إلى</th>
              <th className="text-right">الأيام</th>
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
                  <td><span className="text-secondary text-xs">{branch?.storeName ?? '—'}</span></td>
                  <td><span className="num text-xs text-secondary">{fmtDate(rec.fromDate)}</span></td>
                  <td><span className="num text-xs text-secondary">{fmtDate(rec.toDate)}</span></td>
                  <td>
                    <span className="badge" style={{ background: '#DC262610', color: '#DC2626', borderColor: '#DC262625' }}>
                      {rec.days} يوم
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-tertiary" title={rec.note || undefined}>
                      {rec.note ? (rec.note.length > 28 ? rec.note.slice(0, 28) + '…' : rec.note) : '—'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(rec)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="تعديل">
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

export default function SickLeavePage() {
  const { employees, branches, records, addRecord, updateRecord, deleteRecord, resetRecords, daysBetween } =
    useSickLeave()

  const { session } = useAuth()
  const visEmps    = useMemo(() => filterByViewRole(employees, session?.role), [employees, session?.role])
  const visIds     = useMemo(() => new Set(visEmps.map(e => e.id)), [visEmps])
  const visRecords = useMemo(() => records.filter(r => visIds.has(r.employeeId)), [records, visIds])
  const visKpi     = useMemo(() => ({
    totalEmployees: visEmps.length,
    totalDaysUsed:  Math.round(visRecords.reduce((s, r) => s + r.days, 0) * 100) / 100,
    employeesUsed:  new Set(visRecords.map(r => r.employeeId)).size,
  }), [visEmps, visRecords])

  const [editing, setEditing] = useState<SickLeaveRecord | null>(null)

  function handleSubmit(data: SickLeaveInput) {
    if (editing) { updateRecord(editing.id, data); setEditing(null) }
    else         addRecord(data)
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذا السجل؟')) deleteRecord(id)
  }

  const year = new Date().getFullYear()

  return (
    <div style={{ direction: 'rtl' }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.14)' }}>
              <HeartPulse size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">الإجازة المرضية</h1>
          </div>
          <p className="text-sm text-secondary">تسجيل وتتبع أيام المرض · سنة {year}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <HeartPulse size={12} />
          <span>{visRecords.length} سجل</span>
        </div>
      </div>

      <KPICards kpi={visKpi} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5">
        <div className="flex flex-col gap-4 lg:self-start lg:sticky lg:top-[72px]">
          <SickLeaveForm
            employees={visEmps} branches={branches}
            editing={editing} onSubmit={handleSubmit}
            onCancel={() => setEditing(null)} daysBetween={daysBetween}
          />
          {visRecords.length > 0 && (
            <div className="card p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-2">إعادة التعيين</p>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-500/10"
                style={{ color: '#DC2626' }}
                onClick={() => { if (window.confirm('حذف جميع سجلات المرضى؟')) resetRecords() }}>
                <Trash2 size={13} /> حذف جميع السجلات
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-primary">سجلات الإجازة المرضية</h2>
            <span className="text-xs text-tertiary">{visRecords.length} سجل إجمالي</span>
          </div>
          <SickLeaveTable
            records={visRecords} employees={visEmps} branches={branches}
            onEdit={r => { setEditing(r); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}
