import { useState } from 'react'
import { Repeat2, Plus, Save, X, Trash2, Pencil, Gift, Clock } from 'lucide-react'
import { useInsteadOf } from '@/hooks/useInsteadOf'
import { useLanguage }  from '@/context/LanguageContext'
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

function KPICards({ kpi }: { kpi: ReturnType<typeof useInsteadOf>['kpi'] }) {
  const cards = [
    { label: 'أيام عمل في الإجازة', value: kpi.totalRecords,  sub: 'إجمالي هذه السنة', color: WE },
    { label: 'موظفون اشتغلوا',       value: kpi.uniqueWorkers, sub: 'موظف',             color: '#0EA5E9' },
    { label: 'أيام مستحقة (لم تُعطَ)', value: kpi.totalOwed,  sub: 'يوم متبقي',        color: '#F59E0B' },
    { label: 'أيام بدل أُعطيت',       value: kpi.totalGiven,  sub: 'يوم بدل',          color: '#10B981' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-secondary mb-1">{c.label}</p>
          <p className="text-2xl font-black num" style={{ color: c.color }}>{c.value}</p>
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
  const { lang } = useLanguage()
  const [employeeId,        setEmployeeId]        = useState(editing?.employeeId        ?? '')
  const [branchId,          setBranchId]          = useState(editing?.branchId          ?? '')
  const [date,              setDate]              = useState(editing?.date              ?? todayStr())
  const [compensatoryDate,  setCompensatoryDate]  = useState(editing?.compensatoryDate  ?? '')
  const [note,              setNote]              = useState(editing?.note              ?? '')

  const isEdit = !!editing

  function reset() {
    setEmployeeId(''); setBranchId(''); setDate(todayStr())
    setCompensatoryDate(''); setNote('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !date) return
    onSubmit({
      employeeId,
      branchId:         branchId || undefined,
      date,
      compensatoryDate: compensatoryDate || undefined,
      note,
    })
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
            {isEdit ? 'تعديل السجل' : 'تسجيل يوم عمل في الإجازة'}
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
        {/* Employee */}
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

        {/* Date worked */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            تاريخ العمل في الإجازة <span className="text-red-500">*</span>
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" required />
        </div>

        {/* Branch (optional) */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الفرع <span className="text-tertiary font-normal">(اختياري)</span>
          </label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input">
            <option value="">— بدون تحديد فرع —</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {lang === 'ar' ? (b.storeNameAr || b.storeName) : b.storeName}
              </option>
            ))}
          </select>
        </div>

        {/* Compensatory date (optional) */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            <span className="flex items-center gap-1.5">
              <Gift size={11} style={{ color: '#10B981' }} />
              تاريخ يوم البدل <span className="text-tertiary font-normal">(اختياري — إن أُعطي)</span>
            </span>
          </label>
          <input
            type="date"
            value={compensatoryDate}
            onChange={e => setCompensatoryDate(e.target.value)}
            className="we-input"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">ملاحظة</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="سبب العمل، مناسبة..." className="we-input" maxLength={200} />
        </div>

        <button type="submit"
          disabled={!employeeId || !date}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />تسجيل اليوم</>}
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
  const { lang } = useLanguage()
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))

  if (records.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center gap-3 text-center">
        <Repeat2 size={38} className="text-tertiary" strokeWidth={1.4} />
        <p className="text-secondary font-semibold text-sm">لا توجد سجلات</p>
        <p className="text-tertiary text-xs">ابدأ بتسجيل أول يوم عمل في الإجازة</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Mobile */}
      <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
        {records.map(rec => {
          const emp    = empMap[rec.employeeId]
          const branch = rec.branchId ? branchMap[rec.branchId] : undefined
          const given  = !!rec.compensatoryDate
          return (
            <div key={rec.id} className="p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-primary text-sm">{emp ? getEmpName(emp) : '—'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${given ? 'text-emerald-500' : 'text-amber-500'}`}
                  style={{ background: given ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
                  {given ? 'أُعطي البدل' : 'مستحق'}
                </span>
              </div>
              <p className="text-xs text-secondary">{fmtDate(rec.date)}</p>
              {branch && <p className="text-xs text-tertiary">{lang === 'ar' ? (branch.storeNameAr || branch.storeName) : branch.storeName}</p>}
              {rec.compensatoryDate && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#10B981' }}>
                  <Gift size={10} />يوم البدل: {fmtDate(rec.compensatoryDate)}
                </p>
              )}
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
        <table className="we-table w-full min-w-[750px]">
          <thead>
            <tr>
              <th className="text-right">الموظف</th>
              <th className="text-right">تاريخ العمل</th>
              <th className="text-right">الفرع</th>
              <th className="text-right">يوم البدل</th>
              <th className="text-right">الحالة</th>
              <th className="text-right">ملاحظة</th>
              <th className="text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {records.map(rec => {
              const emp    = empMap[rec.employeeId]
              const branch = rec.branchId ? branchMap[rec.branchId] : undefined
              const given  = !!rec.compensatoryDate
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
                    {rec.compensatoryDate ? (
                      <span className="num text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
                        <Gift size={10} />{fmtDate(rec.compensatoryDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-tertiary flex items-center gap-1">
                        <Clock size={10} />لم يُعطَ بعد
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${given ? 'text-emerald-500' : 'text-amber-500'}`}
                      style={{ background: given ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
                      {given ? 'أُعطي البدل' : 'مستحق'}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-tertiary" title={rec.note || undefined}>
                      {rec.note ? (rec.note.length > 25 ? rec.note.slice(0, 25) + '…' : rec.note) : '—'}
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

// ── Summary per employee ──────────────────────────────────────────────────

function SummaryTable({ summaries }: { summaries: ReturnType<typeof useInsteadOf>['summaries'] }) {
  const active = summaries.filter(s => s.workedCount > 0)
  if (active.length === 0) return null

  return (
    <div className="card overflow-hidden mb-5">
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-bold text-primary">ملخص الأيام المستحقة</h2>
      </div>
      <div className="table-scroll">
        <table className="we-table w-full min-w-[480px]">
          <thead>
            <tr>
              <th className="text-right">الموظف</th>
              <th className="text-right">أيام اشتغل</th>
              <th className="text-right">بدل أُعطي</th>
              <th className="text-right">متبقي مستحق</th>
            </tr>
          </thead>
          <tbody>
            {active.map(s => (
              <tr key={s.employee.id}>
                <td><span className="font-semibold text-primary text-sm">{getEmpName(s.employee)}</span></td>
                <td><span className="num font-bold text-primary">{s.workedCount}</span></td>
                <td><span className="num" style={{ color: '#10B981' }}>{s.compensatoryGiven}</span></td>
                <td>
                  <span className={`num font-bold ${s.remainingOwed > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {s.remainingOwed}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function InsteadOfPage() {
  const { employees, branches, records, summaries, kpi, addRecord, updateRecord, deleteRecord } =
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
          <p className="text-sm text-secondary">
            أيام العمل في وقت الإجازة — تتراكم ويُعطى بدلها · سنة {year}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Repeat2 size={12} />
          <span>{records.length} يوم</span>
        </div>
      </div>

      <KPICards kpi={kpi} />

      <SummaryTable summaries={summaries} />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <div className="lg:self-start lg:sticky lg:top-[72px]">
          <InsteadOfForm
            employees={employees} branches={branches}
            editing={editing} onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-primary">سجل أيام العمل في الإجازة</h2>
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
