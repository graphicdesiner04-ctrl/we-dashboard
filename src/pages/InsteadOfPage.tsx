import { useState } from 'react'
import { Repeat2, Plus, Save, X, Trash2, Pencil } from 'lucide-react'
import { useInsteadOf } from '@/hooks/useInsteadOf'
import { getEmpName }   from '@/data/seedData'
import type { InsteadOfRecord } from '@/types/hr'
import type { InsteadOfInput }  from '@/hooks/useInsteadOf'

const WE = '#6B21A8'

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── KPI ───────────────────────────────────────────────────────────────────

function KPICards({ kpi }: { kpi: { totalRecords: number; uniqueWorkers: number; uniqueReplaced: number } }) {
  const cards = [
    { label: 'إجمالي السجلات', value: kpi.totalRecords, sub: 'هذه السنة' },
    { label: 'موظفون اشتغلوا بدلاً', value: kpi.uniqueWorkers, sub: 'موظف' },
    { label: 'موظفون تم استبدالهم', value: kpi.uniqueReplaced, sub: 'موظف' },
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

function InsteadOfForm({
  employees, branches, editing, onSubmit, onCancel,
}: {
  employees: ReturnType<typeof useInsteadOf>['employees']
  branches:  ReturnType<typeof useInsteadOf>['branches']
  editing:   InsteadOfRecord | null
  onSubmit:  (data: InsteadOfInput) => void
  onCancel:  () => void
}) {
  const [employeeId,         setEmployeeId]         = useState(editing?.employeeId         ?? '')
  const [replacedEmployeeId, setReplacedEmployeeId] = useState(editing?.replacedEmployeeId ?? '')
  const [branchId,           setBranchId]           = useState(editing?.branchId           ?? '')
  const [date,               setDate]               = useState(editing?.date               ?? todayStr())
  const [note,               setNote]               = useState(editing?.note               ?? '')

  const isEdit = !!editing

  function reset() {
    setEmployeeId(''); setReplacedEmployeeId(''); setBranchId('')
    setDate(todayStr()); setNote('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !replacedEmployeeId || !branchId || !date) return
    if (employeeId === replacedEmployeeId) return
    onSubmit({ employeeId, replacedEmployeeId, branchId, date, note })
    if (!isEdit) reset()
  }

  return (
    <div className="we-form-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
            <Repeat2 size={15} style={{ color: WE }} />
          </div>
          <h3 className="text-sm font-bold text-primary">
            {isEdit ? 'تعديل سجل البدلاً من' : 'إضافة بدلاً من'}
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
            من اشتغل <span className="text-red-500">*</span>
          </label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="we-input" required>
            <option value="">اختر الموظف الذي اشتغل</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id} disabled={emp.id === replacedEmployeeId}>
                {getEmpName(emp)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            بدلاً من <span className="text-red-500">*</span>
          </label>
          <select value={replacedEmployeeId} onChange={e => setReplacedEmployeeId(e.target.value)} className="we-input" required>
            <option value="">اختر الموظف الذي تم استبداله</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id} disabled={emp.id === employeeId}>
                {getEmpName(emp)}
              </option>
            ))}
          </select>
        </div>

        {employeeId && replacedEmployeeId && employeeId !== replacedEmployeeId && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
            style={{ background: `${WE}0E`, border: `1px solid ${WE}25` }}>
            <Repeat2 size={12} style={{ color: WE }} />
            <span className="font-semibold" style={{ color: WE }}>
              {getEmpName(employees.find(e => e.id === employeeId)!)}
            </span>
            <span className="text-secondary">اشتغل بدلاً من</span>
            <span className="font-semibold" style={{ color: WE }}>
              {getEmpName(employees.find(e => e.id === replacedEmployeeId)!)}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">الفرع <span className="text-red-500">*</span></label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input" required>
            <option value="">اختر الفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.storeName}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">التاريخ <span className="text-red-500">*</span></label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" required />
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">ملاحظة</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="سبب الاستبدال..." className="we-input" maxLength={200} />
        </div>

        <button type="submit"
          disabled={!employeeId || !replacedEmployeeId || !branchId || !date || employeeId === replacedEmployeeId}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />إضافة السجل</>}
        </button>
      </form>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────

function InsteadOfTable({
  records, employees, branches, onEdit, onDelete,
}: {
  records:   InsteadOfRecord[]
  employees: ReturnType<typeof useInsteadOf>['employees']
  branches:  ReturnType<typeof useInsteadOf>['branches']
  onEdit:    (r: InsteadOfRecord) => void
  onDelete:  (id: string) => void
}) {
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))

  if (records.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center gap-3 text-center">
        <Repeat2 size={38} className="text-tertiary" strokeWidth={1.4} />
        <p className="text-secondary font-semibold text-sm">لا توجد سجلات بدلاً من</p>
        <p className="text-tertiary text-xs">ابدأ بإضافة أول سجل من النموذج</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Mobile */}
      <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
        {records.map(rec => {
          const worker   = empMap[rec.employeeId]
          const replaced = empMap[rec.replacedEmployeeId]
          const branch   = branchMap[rec.branchId]
          return (
            <div key={rec.id} className="p-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-primary text-sm">{worker ? getEmpName(worker) : '—'}</span>
                <Repeat2 size={13} className="text-tertiary flex-shrink-0" />
                <span className="text-sm text-secondary">{replaced ? getEmpName(replaced) : '—'}</span>
              </div>
              <p className="text-xs text-tertiary">{branch?.storeName ?? '—'} · {fmtDate(rec.date)}</p>
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
        <table className="we-table w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="text-right">من اشتغل</th>
              <th className="text-right">بدلاً من</th>
              <th className="text-right">الفرع</th>
              <th className="text-right">التاريخ</th>
              <th className="text-right">ملاحظة</th>
              <th className="text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {records.map(rec => {
              const worker   = empMap[rec.employeeId]
              const replaced = empMap[rec.replacedEmployeeId]
              const branch   = branchMap[rec.branchId]
              return (
                <tr key={rec.id}>
                  <td><span className="font-semibold text-primary text-sm">{worker ? getEmpName(worker) : '—'}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Repeat2 size={12} className="text-tertiary flex-shrink-0" />
                      <span className="text-secondary text-sm">{replaced ? getEmpName(replaced) : '—'}</span>
                    </div>
                  </td>
                  <td><span className="text-secondary text-xs">{branch?.storeName ?? '—'}</span></td>
                  <td><span className="num text-xs text-secondary">{fmtDate(rec.date)}</span></td>
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

export default function InsteadOfPage() {
  const { employees, branches, records, kpi, addRecord, updateRecord, deleteRecord } =
    useInsteadOf()

  const [editing, setEditing] = useState<InsteadOfRecord | null>(null)

  function handleSubmit(data: InsteadOfInput) {
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
              <Repeat2 size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">بدلاً من</h1>
          </div>
          <p className="text-sm text-secondary">تسجيل حالات الاستبدال بين الموظفين · سنة {year}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Repeat2 size={12} />
          <span>{records.length} سجل</span>
        </div>
      </div>

      <KPICards kpi={kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5">
        <div className="lg:self-start lg:sticky lg:top-[72px]">
          <InsteadOfForm
            employees={employees} branches={branches}
            editing={editing} onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-primary">سجلات بدلاً من</h2>
            <span className="text-xs text-tertiary">{records.length} سجل إجمالي</span>
          </div>
          <InsteadOfTable
            records={records} employees={employees} branches={branches}
            onEdit={r => { setEditing(r); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}
