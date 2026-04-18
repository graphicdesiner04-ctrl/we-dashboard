import { useState, useMemo } from 'react'
import {
  Star, Plus, Save, X, Pencil, Trash2,
  ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import { useEvaluation } from '@/hooks/useEvaluation'
import { useLanguage }   from '@/context/LanguageContext'
import { getEmpName }    from '@/data/seedData'
import type { EvaluationRecord, EvaluationInput } from '@/hooks/useEvaluation'

const WE    = '#6B21A8'
const GREEN = '#059669'
const RED   = '#DC2626'

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── KPI bar ───────────────────────────────────────────────────────────────

function KPIBar({ kpi }: { kpi: ReturnType<typeof useEvaluation>['kpi'] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">إجمالي التقييمات</p>
        <p className="text-2xl font-black num" style={{ color: WE }}>{kpi.totalRecords}</p>
        <p className="text-xs text-tertiary mt-0.5">{kpi.uniqueEmployees} موظف</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">إيجابيات</p>
        <p className="text-2xl font-black num" style={{ color: GREEN }}>{kpi.totalPositive}</p>
        <p className="text-xs text-tertiary mt-0.5">هذه السنة</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">سلبيات</p>
        <p className="text-2xl font-black num" style={{ color: RED }}>{kpi.totalNegative}</p>
        <p className="text-xs text-tertiary mt-0.5">هذه السنة</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">هذا الشهر</p>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-black num" style={{ color: GREEN }}>+{kpi.monthPositive}</p>
          <p className="text-xl font-black num mb-0.5" style={{ color: RED }}>−{kpi.monthNegative}</p>
        </div>
        <p className="text-xs text-tertiary mt-0.5">إيجابي / سلبي</p>
      </div>
    </div>
  )
}

// ── Eval Form ─────────────────────────────────────────────────────────────

function EvalForm({
  employees, branches, editing, onSubmit, onCancel,
}: {
  employees: ReturnType<typeof useEvaluation>['employees']
  branches:  ReturnType<typeof useEvaluation>['branches']
  editing:   EvaluationRecord | null
  onSubmit:  (data: EvaluationInput) => void
  onCancel:  () => void
}) {
  const { lang } = useLanguage()
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '')
  const [score,      setScore]      = useState<1 | -1>(editing?.score ?? 1)
  const [note,       setNote]       = useState(editing?.note ?? '')
  const [date,       setDate]       = useState(editing?.date ?? todayStr())
  const [branchId,   setBranchId]   = useState(editing?.branchId ?? '')

  const isEdit = !!editing

  function reset() {
    setEmployeeId(''); setScore(1); setNote(''); setDate(todayStr()); setBranchId('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !note.trim()) return
    onSubmit({ employeeId, score, note: note.trim(), date, branchId: branchId || undefined })
    if (!isEdit) reset()
  }

  return (
    <div className="we-form-section">
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

        {/* Score toggle */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">نوع التقييم</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              onClick={() => setScore(1)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
              style={score === 1
                ? { background: `${GREEN}15`, borderColor: GREEN, color: GREEN }
                : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <ThumbsUp size={14} /> إيجابي
            </button>
            <button type="button"
              onClick={() => setScore(-1)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
              style={score === -1
                ? { background: `${RED}15`, borderColor: RED, color: RED }
                : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <ThumbsDown size={14} /> سلبي
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الملاحظة <span className="text-red-500">*</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="وصف التقييم..." className="we-input resize-none" rows={3} maxLength={300} required />
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" />
        </div>

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
          {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />إضافة التقييم</>}
        </button>
      </form>
    </div>
  )
}

// ── Employee Eval Card ────────────────────────────────────────────────────

function EmployeeEvalCard({
  summary, branches, onEdit, onDelete,
}: {
  summary:  ReturnType<typeof useEvaluation>['summaries'][0]
  branches: ReturnType<typeof useEvaluation>['branches']
  onEdit:   (r: EvaluationRecord) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { employee, totalPositive, totalNegative, netScore, records } = summary
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])
  const name = getEmpName(employee)

  const scoreColor = netScore > 0 ? GREEN : netScore < 0 ? RED : 'var(--text-tertiary)'

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}>
          {name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-primary text-sm truncate">{name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] font-bold" style={{ color: GREEN }}>+{totalPositive} إيجابي</span>
            <span className="text-[10px] font-bold" style={{ color: RED }}>−{totalNegative} سلبي</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg font-black num" style={{ color: scoreColor }}>
            {netScore > 0 ? '+' : ''}{netScore}
          </span>
          {open ? <ChevronUp size={14} className="text-tertiary" /> : <ChevronDown size={14} className="text-tertiary" />}
        </div>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {records.map(rec => {
              const br = rec.branchId ? branchMap[rec.branchId] : null
              return (
                <div key={rec.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {rec.score === 1
                      ? <ThumbsUp size={13} style={{ color: GREEN }} />
                      : <ThumbsDown size={13} style={{ color: RED }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary leading-relaxed">{rec.note}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-tertiary num">{fmtDate(rec.date)}</span>
                      {br && <span className="text-[10px] text-tertiary">{br.storeNameAr || br.storeName}</span>}
                    </div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => onEdit(rec)}
                      className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                      title="تعديل">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => onDelete(rec.id)}
                      className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="حذف">
                      <Trash2 size={12} />
                    </button>
                  </div>
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

export default function EvaluationPage() {
  const {
    employees, branches, records, summaries, kpi,
    addRecord, updateRecord, deleteRecord,
  } = useEvaluation()

  const [editing, setEditing] = useState<EvaluationRecord | null>(null)
  const [search,  setSearch]  = useState('')

  function handleSubmit(data: EvaluationInput) {
    if (editing) { updateRecord(editing.id, data); setEditing(null) }
    else          addRecord(data)
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذا التقييم؟')) deleteRecord(id)
  }

  const year = new Date().getFullYear()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return summaries
    return summaries.filter(s => getEmpName(s.employee).toLowerCase().includes(q))
  }, [summaries, search])

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
            تقييم أداء الموظفين إيجابياً وسلبياً · سنة {year}
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

        {/* Left: form */}
        <div className="lg:self-start lg:sticky lg:top-[72px]">
          <EvalForm
            key={editing?.id ?? 'new'}
            employees={employees} branches={branches}
            editing={editing} onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>

        {/* Right: employee cards */}
        <div className="min-w-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
              style={{ right: '0.75rem' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث عن موظف..."
              className="we-input pr-9 w-full"
            />
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-primary">الموظفون · سنة {year}</h2>
            <span className="text-xs text-tertiary">{filtered.length} موظف مقيَّم</span>
          </div>

          {filtered.length === 0 ? (
            <div className="card p-12 flex flex-col items-center gap-3 text-center">
              <Star size={38} className="text-tertiary" strokeWidth={1.4} />
              <p className="text-secondary font-semibold text-sm">لا توجد تقييمات بعد</p>
              <p className="text-tertiary text-xs">أضف أول تقييم من النموذج على اليسار</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {filtered.map(summary => (
                <EmployeeEvalCard
                  key={summary.employee.id}
                  summary={summary}
                  branches={branches}
                  onEdit={r => { setEditing(r); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
