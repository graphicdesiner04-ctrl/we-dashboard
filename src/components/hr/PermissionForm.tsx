import { useState, useEffect } from 'react'
import { Plus, Save, X, Clock, AlertCircle } from 'lucide-react'
import type { Employee, Branch, PermissionRecord, EmployeeSummary } from '@/types/hr'
import { MONTHLY_LIMIT_HOURS } from '@/types/hr'
import type { PermissionInput } from '@/hooks/usePermissions'
import { getEmpName } from '@/data/seedData'

const WE = '#6B21A8'
const HOUR_OPTS = Array.from({ length: 9 }, (_, i) => i)
const MIN_OPTS  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function todayStr() { return new Date().toISOString().slice(0, 10) }

interface Props {
  employees: Employee[]
  branches: Branch[]
  summaries: EmployeeSummary[]
  editingRecord: PermissionRecord | null
  onSubmit: (data: PermissionInput) => void
  onCancelEdit: () => void
  onEmployeeSelect: (id: string) => void
}

export default function PermissionForm({
  employees, branches, summaries, editingRecord, onSubmit, onCancelEdit, onEmployeeSelect,
}: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [branchId,   setBranchId]   = useState('')
  const [date,       setDate]       = useState(todayStr)
  const [fromTime,   setFromTime]   = useState('')
  const [toTime,     setToTime]     = useState('')
  const [hours,      setHours]      = useState(0)
  const [minutes,    setMinutes]    = useState(0)
  const [note,       setNote]       = useState('')

  const isEditing = !!editingRecord

  useEffect(() => {
    if (editingRecord) {
      setEmployeeId(editingRecord.employeeId)
      setBranchId(editingRecord.branchId ?? '')
      setDate(editingRecord.date)
      setFromTime(editingRecord.fromTime ?? '')
      setToTime(editingRecord.toTime ?? '')
      setHours(editingRecord.hours)
      setMinutes(editingRecord.minutes)
      setNote(editingRecord.note)
    } else {
      reset()
    }
  }, [editingRecord])

  function reset() {
    setEmployeeId(''); setBranchId(''); setDate(todayStr())
    setFromTime(''); setToTime('')
    setHours(0); setMinutes(0); setNote('')
  }

  const decimal = Math.round((hours + minutes / 60) * 100) / 100
  const summary = summaries.find(s => s.employee.id === employeeId)
  const currentTotal = summary?.totalDecimalHours ?? 0
  const subtractOwn  = isEditing ? (editingRecord?.decimalHours ?? 0) : 0
  const projected    = currentTotal - subtractOwn + decimal
  const wouldExceed  = !!employeeId && decimal > 0 && projected > MONTHLY_LIMIT_HOURS

  function handleEmployee(id: string) {
    setEmployeeId(id)
    onEmployeeSelect(id)
    // Pre-fill branch from current assignment if available
    const s = summaries.find(x => x.employee.id === id)
    if (s?.currentBranchId) setBranchId(s.currentBranchId)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !branchId || decimal === 0) return
    onSubmit({ employeeId, branchId, date, fromTime: fromTime || undefined, toTime: toTime || undefined, hours, minutes, note })
    if (!isEditing) reset()
  }

  return (
    <div className="we-form-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
            <Clock size={15} style={{ color: WE }} />
          </div>
          <h3 className="text-sm font-bold text-primary">
            {isEditing ? 'تعديل الإذن' : 'إضافة إذن جديد'}
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
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{getEmpName(emp)}</option>
            ))}
          </select>
        </div>

        {/* Branch — selected manually per record */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الفرع <span className="text-red-500">*</span>
          </label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input" required>
            <option value="">اختر الفرع</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.storeName}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            التاريخ <span className="text-red-500">*</span>
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" required />
        </div>

        {/* From / To time (optional) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">من (اختياري)</label>
            <input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} className="we-input" />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">إلى (اختياري)</label>
            <input type="time" value={toTime} onChange={e => setToTime(e.target.value)} className="we-input" />
          </div>
        </div>

        {/* Hours + Minutes */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الساعات</label>
            <select value={hours} onChange={e => setHours(+e.target.value)} className="we-input">
              {HOUR_OPTS.map(h => <option key={h} value={h}>{h} ساعة</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الدقائق</label>
            <select value={minutes} onChange={e => setMinutes(+e.target.value)} className="we-input">
              {MIN_OPTS.map(m => <option key={m} value={m}>{m} دقيقة</option>)}
            </select>
          </div>
        </div>

        {/* Decimal preview */}
        {decimal > 0 && (
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl"
            style={{ background: `${WE}0E`, border: `1px solid ${WE}25` }}>
            <span className="text-secondary">المدة بالعشري</span>
            <span className="font-black num" style={{ color: WE }}>{decimal} ساعة</span>
          </div>
        )}

        {/* Over-limit warning */}
        {wouldExceed && (
          <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-xl"
            style={{ background: '#DC262610', border: '1px solid #DC262625' }}>
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
            <span style={{ color: '#DC2626' }}>
              سيتجاوز الحد المسموح ({MONTHLY_LIMIT_HOURS} ساعات/شهر). سيُحفظ مع تسجيل التجاوز.
            </span>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">ملاحظة</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="سبب الإذن..." className="we-input" maxLength={200} />
        </div>

        {/* Submit */}
        <button type="submit" disabled={!employeeId || !branchId || decimal === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${WE}, #4C1D95)` }}>
          {isEditing ? <><Save size={14} /> حفظ التعديلات</> : <><Plus size={14} /> إضافة الإذن</>}
        </button>
      </form>
    </div>
  )
}
