import { useState, useEffect } from 'react'
import { Plus, Save, X, Calendar, AlertCircle } from 'lucide-react'
import type { Employee, Branch, AnnualLeaveRecord, AnnualLeaveSummary } from '@/types/hr'
import { ANNUAL_LEAVE_DAYS } from '@/types/hr'
import type { AnnualLeaveInput } from '@/hooks/useAnnualLeave'
import { getEmpName } from '@/data/seedData'

const WE = '#6B21A8'

const DAY_OPTS = [
  ...Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5),
  ...Array.from({ length: 20 }, (_, i) => i + 11),
]

function todayStr() { return new Date().toISOString().slice(0, 10) }

interface Props {
  employees: Employee[]
  branches: Branch[]
  summaries: AnnualLeaveSummary[]
  editingRecord: AnnualLeaveRecord | null
  onSubmit: (data: AnnualLeaveInput) => void
  onCancelEdit: () => void
  onEmployeeSelect: (id: string) => void
}

export default function AnnualLeaveForm({
  employees, branches, summaries, editingRecord, onSubmit, onCancelEdit, onEmployeeSelect,
}: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [branchId,   setBranchId]   = useState('')
  const [date,       setDate]       = useState(todayStr)
  const [days,       setDays]       = useState(1)
  const [note,       setNote]       = useState('')

  const isEditing = !!editingRecord

  useEffect(() => {
    if (editingRecord) {
      setEmployeeId(editingRecord.employeeId)
      setBranchId(editingRecord.branchId ?? '')
      setDate(editingRecord.date)
      setDays(editingRecord.days)
      setNote(editingRecord.note)
    } else {
      reset()
    }
  }, [editingRecord])

  function reset() {
    setEmployeeId(''); setBranchId(''); setDate(todayStr()); setDays(1); setNote('')
  }

  const summary   = summaries.find(s => s.employee.id === employeeId)
  const current   = summary?.totalDaysUsed ?? 0
  const ownDays   = isEditing ? (editingRecord?.days ?? 0) : 0
  const projected = Math.round((current - ownDays + days) * 100) / 100
  const wouldExceed = !!employeeId && days > 0 && projected > ANNUAL_LEAVE_DAYS

  function handleEmployee(id: string) {
    setEmployeeId(id)
    onEmployeeSelect(id)
    const s = summaries.find(x => x.employee.id === id)
    if (s?.currentBranchId) setBranchId(s.currentBranchId)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !branchId || days <= 0) return
    onSubmit({ employeeId, branchId, date, days, note })
    if (!isEditing) reset()
  }

  return (
    <div className="we-form-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
            <Calendar size={15} style={{ color: WE }} />
          </div>
          <h3 className="text-sm font-bold text-primary">
            {isEditing ? 'تعديل إجازة' : 'إضافة إجازة جديدة'}
          </h3>
        </div>
        {isEditing && (
          <button type="button" onClick={onCancelEdit}
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
          <select value={employeeId} onChange={e => handleEmployee(e.target.value)} className="we-input" required>
            <option value="">اختر الموظف</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{getEmpName(emp)}</option>)}
          </select>
        </div>

        {/* Branch */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الفرع <span className="text-red-500">*</span>
          </label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input" required>
            <option value="">اختر الفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.storeName}</option>)}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            تاريخ البداية <span className="text-red-500">*</span>
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" required />
        </div>

        {/* Days */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            عدد الأيام <span className="text-red-500">*</span>
          </label>
          <select value={days} onChange={e => setDays(+e.target.value)} className="we-input">
            {DAY_OPTS.map(d => <option key={d} value={d}>{d} {d === 1 ? 'يوم' : 'أيام'}</option>)}
          </select>
        </div>

        {/* Projected total */}
        {employeeId && days > 0 && (
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl"
            style={{ background: `${WE}0E`, border: `1px solid ${WE}25` }}>
            <span className="text-secondary">الإجمالي بعد الإضافة</span>
            <span className="font-black num" style={{ color: WE }}>{projected} / {ANNUAL_LEAVE_DAYS} يوم</span>
          </div>
        )}

        {/* Over-limit warning */}
        {wouldExceed && (
          <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-xl"
            style={{ background: '#DC262610', border: '1px solid #DC262625' }}>
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
            <span style={{ color: '#DC2626' }}>
              سيتجاوز الحد المسموح ({ANNUAL_LEAVE_DAYS} يوم/سنة). سيُحفظ مع تسجيل التجاوز.
            </span>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">ملاحظة</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="سبب الإجازة..." className="we-input" maxLength={200} />
        </div>

        {/* Submit */}
        <button type="submit" disabled={!employeeId || !branchId || days <= 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${WE}, #4C1D95)` }}>
          {isEditing ? <><Save size={14} /> حفظ التعديلات</> : <><Plus size={14} /> إضافة الإجازة</>}
        </button>
      </form>
    </div>
  )
}
