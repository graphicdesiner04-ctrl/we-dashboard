import { useState, useMemo } from 'react'
import {
  Star, Plus, Save, X, Pencil, Trash2,
  ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useEvaluation } from '@/hooks/useEvaluation'
import { useLanguage }   from '@/context/LanguageContext'
import { getEmpName }    from '@/data/seedData'
import type { EvaluationRecord, EvaluationInput } from '@/hooks/useEvaluation'
import type { Employee, Branch } from '@/types/hr'

const WE    = '#6B21A8'
const GREEN = '#059669'
const RED   = '#DC2626'

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtMonth(ym: string) {
  return new Date(ym + '-01T00:00:00').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short',
  })
}

// ── KPI bar (yearly totals) ───────────────────────────────────────────────

function KPIBar({ kpi }: { kpi: ReturnType<typeof useEvaluation>['kpi'] }) {
  const nc = kpi.monthNet > 0 ? GREEN : kpi.monthNet < 0 ? RED : 'var(--text-tertiary)'
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">إجمالي التقييمات</p>
        <p className="text-2xl font-black num" style={{ color: WE }}>{kpi.totalRecords}</p>
        <p className="text-xs text-tertiary mt-0.5">{kpi.uniqueEmployees} موظف مقيَّم — هذه السنة</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">درجات إيجابية</p>
        <p className="text-2xl font-black num" style={{ color: GREEN }}>+{kpi.totalPositiveDeg}</p>
        <p className="text-xs text-tertiary mt-0.5">مجموع الدرجات — هذه السنة</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">درجات سلبية</p>
        <p className="text-2xl font-black num" style={{ color: RED }}>−{kpi.totalNegativeDeg}</p>
        <p className="text-xs text-tertiary mt-0.5">مجموع الدرجات — هذه السنة</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">صافي هذا الشهر</p>
        <p className="text-2xl font-black num" style={{ color: nc }}>
          {kpi.monthNet > 0 ? '+' : ''}{kpi.monthNet}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-bold" style={{ color: GREEN }}>+{kpi.monthPositiveDeg}</span>
          <span className="text-[10px] text-tertiary">/</span>
          <span className="text-[10px] font-bold" style={{ color: RED }}>−{kpi.monthNegativeDeg}</span>
        </div>
      </div>
    </div>
  )
}

// ── Eval Form ─────────────────────────────────────────────────────────────

function EvalForm({
  employees, branches, editing, onSubmit, onCancel,
}: {
  employees: Employee[]
  branches:  Branch[]
  editing:   EvaluationRecord | null
  onSubmit:  (data: EvaluationInput) => void
  onCancel:  () => void
}) {
  const { lang } = useLanguage()

  const [direction, setDirection] = useState<1 | -1>(() =>
    editing ? (editing.score >= 0 ? 1 : -1) : 1,
  )
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '')
  const [note,       setNote]       = useState(editing?.note ?? '')
  const [date,       setDate]       = useState(editing?.date ?? todayStr())
  const [branchId,   setBranchId]   = useState(editing?.branchId ?? '')

  const FIXED_DEGREES = 7
  const isEdit        = !!editing
  const score         = direction * FIXED_DEGREES
  const scoreColor    = direction === 1 ? GREEN : RED

  function reset() {
    setEmployeeId(''); setDirection(1)
    setNote(''); setDate(todayStr()); setBranchId('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !note.trim()) return
    onSubmit({ employeeId, score, note: note.trim(), date, branchId: branchId || undefined })
    if (!isEdit) reset()
  }

  return (
    <div className="we-form-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
            <Star size={15} style={{ color: WE }} />
          </div>
          <h3 className="text-sm font-bold text-primary">
            {isEdit ? 'تعديل التقييم' : 'إضافة تقييم جديد'}
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
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
            className="we-input" required>
            <option value="">اختر الموظف</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{getEmpName(emp)}</option>
            ))}
          </select>
        </div>

        {/* Direction — fixed ±7 */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1.5">
            نوع التقييم
            <span className="mr-2 font-black text-sm" style={{ color: scoreColor }}>
              ({score > 0 ? '+' : ''}{score} درجة ثابتة)
            </span>
          </label>

          {/* Direction toggle — full width buttons */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setDirection(1)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
              style={direction === 1
                ? { background: `${GREEN}15`, borderColor: GREEN, color: GREEN }
                : { borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
              <ThumbsUp size={14} /> إيجابي +7
            </button>
            <button type="button" onClick={() => setDirection(-1)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
              style={direction === -1
                ? { background: `${RED}15`, borderColor: RED, color: RED }
                : { borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
              <ThumbsDown size={14} /> سلبي −7
            </button>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الكومنت / الملاحظة <span className="text-red-500">*</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="اكتب سبب التقييم..."
            className="we-input resize-none" rows={3} maxLength={300} required />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" />
        </div>

        {/* Branch */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">الفرع (اختياري)</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input">
            <option value="">— غير محدد —</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {lang === 'ar' ? (b.storeNameAr || b.storeName) : b.storeName}
              </option>
            ))}
          </select>
        </div>

        <button type="submit"
          disabled={!employeeId || !note.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          {isEdit
            ? <><Save size={14} /> حفظ التعديلات</>
            : <><Plus size={14} /> إضافة تقييم ({score > 0 ? '+' : ''}{score} درجة)</>
          }
        </button>
      </form>
    </div>
  )
}

// ── Month Section ─────────────────────────────────────────────────────────

type EmpStat = {
  employee: Employee
  records:  EvaluationRecord[]
  pos:      number
  neg:      number
  net:      number
  hasEval:  boolean
}

type MonthData = {
  month:     string
  empStats:  EmpStat[]
  totalPos:  number
  totalNeg:  number
  totalNet:  number
  evaluated: number
}

function MonthSection({
  data, branches, defaultOpen, onEdit, onDelete,
}: {
  data:        MonthData
  branches:    Branch[]
  defaultOpen: boolean
  onEdit:      (r: EvaluationRecord) => void
  onDelete:    (id: string) => void
}) {
  const [open,     setOpen]     = useState(defaultOpen)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])

  function toggleEmp(id: string) {
    setExpanded(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const { month, empStats, totalPos, totalNeg, totalNet, evaluated } = data
  const netColor = totalNet > 0 ? GREEN : totalNet < 0 ? RED : 'var(--text-tertiary)'

  return (
    <div className="card overflow-hidden">
      {/* Month header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-white/[0.02] transition-colors"
        style={{ borderBottom: open ? '1px solid var(--border)' : 'none' }}>

        {/* Month name */}
        <div className="flex-1 text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-primary text-sm">{fmtMonth(month)}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${WE}14`, color: WE }}>
              {evaluated} / {empStats.length} مقيَّم
            </span>
          </div>
        </div>

        {/* KPI badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {totalPos > 0 && (
            <span className="text-xs font-black num px-2 py-1 rounded-lg"
              style={{ background: `${GREEN}14`, color: GREEN }}>+{totalPos}</span>
          )}
          {totalNeg > 0 && (
            <span className="text-xs font-black num px-2 py-1 rounded-lg"
              style={{ background: `${RED}14`, color: RED }}>−{totalNeg}</span>
          )}
          <span className="text-sm font-black num px-2 py-1 rounded-lg"
            style={{ color: netColor, background: totalNet !== 0 ? `${netColor}12` : 'var(--bg-elevated)' }}>
            {totalNet > 0 ? '+' : ''}{totalNet}
          </span>
          {open
            ? <ChevronUp size={14} className="text-tertiary" />
            : <ChevronDown size={14} className="text-tertiary" />
          }
        </div>
      </button>

      {/* Employee list */}
      {open && (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {empStats.map(stat => {
            const name    = getEmpName(stat.employee)
            const isOpen  = expanded.has(stat.employee.id)
            const nc      = stat.net > 0 ? GREEN : stat.net < 0 ? RED : 'var(--text-tertiary)'

            return (
              <div key={stat.employee.id}
                style={{ opacity: stat.hasEval ? 1 : 0.38 }}>

                {/* Employee row */}
                <div
                  className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.015] transition-colors"
                  onClick={() => stat.hasEval && toggleEmp(stat.employee.id)}>

                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                    style={{ background: stat.hasEval ? 'linear-gradient(135deg,#6B21A8,#4C1D95)' : 'var(--bg-elevated)' }}>
                    <span style={{ color: stat.hasEval ? '#fff' : 'var(--text-tertiary)' }}>
                      {name.charAt(0)}
                    </span>
                  </div>

                  {/* Name */}
                  <span className="flex-1 text-sm font-semibold text-primary truncate">{name}</span>

                  {/* Score chips */}
                  {stat.hasEval ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stat.pos > 0 && (
                        <span className="text-[11px] font-black num px-1.5 py-0.5 rounded-lg"
                          style={{ background: `${GREEN}14`, color: GREEN }}>+{stat.pos}</span>
                      )}
                      {stat.neg > 0 && (
                        <span className="text-[11px] font-black num px-1.5 py-0.5 rounded-lg"
                          style={{ background: `${RED}14`, color: RED }}>−{stat.neg}</span>
                      )}
                      <span className="text-sm font-black num px-2 py-0.5 rounded-lg"
                        style={{ color: nc, background: `${nc}12` }}>
                        {stat.net > 0 ? '+' : ''}{stat.net}
                      </span>
                      {isOpen
                        ? <ChevronUp size={12} className="text-tertiary" />
                        : <ChevronDown size={12} className="text-tertiary" />
                      }
                    </div>
                  ) : (
                    <span className="text-xs text-tertiary flex-shrink-0">— لا يوجد تقييم</span>
                  )}
                </div>

                {/* Expanded evaluations */}
                {isOpen && stat.hasEval && (
                  <div className="mx-4 mb-2 rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    {stat.records.map(rec => {
                      const isPos = rec.score > 0
                      const br    = rec.branchId ? branchMap[rec.branchId] : null
                      return (
                        <div key={rec.id}
                          className="px-3 py-2.5 flex items-start gap-2.5 border-b last:border-b-0"
                          style={{ borderColor: 'var(--border)' }}>
                          {/* Score badge */}
                          <span className="flex-shrink-0 text-[11px] font-black num px-2 py-1 rounded-lg mt-0.5"
                            style={{
                              background: isPos ? `${GREEN}15` : `${RED}15`,
                              color: isPos ? GREEN : RED,
                            }}>
                            {isPos ? '+' : ''}{rec.score}
                          </span>
                          {/* Note + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-primary leading-relaxed">{rec.note}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-tertiary">{fmtDate(rec.date)}</span>
                              {br && <span className="text-[10px] text-tertiary">{br.storeNameAr || br.storeName}</span>}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); onEdit(rec) }}
                              className="p-1 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors">
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); onDelete(rec.id) }}
                              className="p-1 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function EvaluationPage() {
  const {
    employees, branches, records, kpi,
    addRecord, updateRecord, deleteRecord,
  } = useEvaluation()

  const [editing, setEditing] = useState<EvaluationRecord | null>(null)

  function handleSubmit(data: EvaluationInput) {
    if (editing) { updateRecord(editing.id, data); setEditing(null) }
    else          addRecord(data)
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذا التقييم؟')) deleteRecord(id)
  }

  // Build monthly breakdown — all employees, all months
  const currentMonth = new Date().toISOString().slice(0, 7)

  const monthlyData = useMemo((): MonthData[] => {
    const monthSet = new Set(records.map(r => r.date.slice(0, 7)))
    monthSet.add(currentMonth)
    const months = [...monthSet].sort((a, b) => b.localeCompare(a)) // newest first

    return months.map(month => {
      const monthRecs = records.filter(r => r.date.startsWith(month))

      const empStats: EmpStat[] = employees.map(emp => {
        const recs = monthRecs.filter(r => r.employeeId === emp.id)
        const pos  = recs.filter(r => r.score > 0).reduce((s, r) => s + r.score, 0)
        const neg  = recs.filter(r => r.score < 0).reduce((s, r) => s + Math.abs(r.score), 0)
        const net  = recs.reduce((s, r) => s + r.score, 0)
        return { employee: emp, records: recs, pos, neg, net, hasEval: recs.length > 0 }
      })

      // Sort: evaluated first (by net desc), then unevaluated (by name)
      empStats.sort((a, b) => {
        if (a.hasEval && !b.hasEval) return -1
        if (!a.hasEval && b.hasEval) return 1
        if (a.hasEval && b.hasEval) return b.net - a.net
        return getEmpName(a.employee).localeCompare(getEmpName(b.employee))
      })

      const totalPos  = empStats.reduce((s, e) => s + e.pos, 0)
      const totalNeg  = empStats.reduce((s, e) => s + e.neg, 0)
      const totalNet  = totalPos - totalNeg
      const evaluated = empStats.filter(e => e.hasEval).length

      return { month, empStats, totalPos, totalNeg, totalNet, evaluated }
    })
  }, [records, employees, currentMonth])

  const year = new Date().getFullYear()

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.14)' }}>
              <Star size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">التقييمات</h1>
          </div>
          <p className="text-sm text-secondary">
            تقييم أداء الموظفين بالدرجات · عرض شهري لكل الموظفين · سنة {year}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Star size={12} />
          <span>{records.length} تقييم</span>
        </div>
      </div>

      <KPIBar kpi={kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">

        {/* Left: form (sticky) */}
        <div className="lg:self-start lg:sticky lg:top-[72px]">
          <EvalForm
            key={editing?.id ?? 'new'}
            employees={employees}
            branches={branches}
            editing={editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>

        {/* Right: monthly sections */}
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-primary">التقييمات الشهرية</h2>
            <span className="text-xs text-tertiary">— كل الموظفين · {employees.length} موظف</span>
          </div>

          {monthlyData.map(data => (
            <MonthSection
              key={data.month}
              data={data}
              branches={branches}
              defaultOpen={data.month === currentMonth}
              onEdit={r => { setEditing(r); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
