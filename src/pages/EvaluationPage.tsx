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
  const monthColor = kpi.monthNet > 0 ? GREEN : kpi.monthNet < 0 ? RED : 'var(--text-tertiary)'
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="card p-4">
        <p className="text-xs text-secondary mb-1">إجمالي التقييمات</p>
        <p className="text-2xl font-black num" style={{ color: WE }}>{kpi.totalRecords}</p>
        <p className="text-xs text-tertiary mt-0.5">{kpi.uniqueEmployees} موظف</p>
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
        <p className="text-2xl font-black num" style={{ color: monthColor }}>
          {kpi.monthNet > 0 ? '+' : ''}{kpi.monthNet}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-bold" style={{ color: GREEN }}>+{kpi.monthPositiveDeg}</span>
          <span className="text-[10px] text-tertiary">/</span>
          <span className="text-[10px] font-bold" style={{ color: RED }}>−{kpi.monthNegativeDeg}</span>
          <span className="text-[10px] text-tertiary">درجة</span>
        </div>
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

  // direction: + or -
  const [direction, setDirection] = useState<1 | -1>(() =>
    editing ? (editing.score >= 0 ? 1 : -1) : 1,
  )
  // degrees: absolute value
  const [degrees,    setDegrees]    = useState<number>(() =>
    editing ? Math.abs(editing.score) : 1,
  )
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '')
  const [note,       setNote]       = useState(editing?.note ?? '')
  const [date,       setDate]       = useState(editing?.date ?? todayStr())
  const [branchId,   setBranchId]   = useState(editing?.branchId ?? '')

  const isEdit = !!editing

  function reset() {
    setEmployeeId(''); setDirection(1); setDegrees(1); setNote(''); setDate(todayStr()); setBranchId('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !note.trim() || degrees < 1) return
    const score = direction * degrees
    onSubmit({ employeeId, score, note: note.trim(), date, branchId: branchId || undefined })
    if (!isEdit) reset()
  }

  // Live preview of score
  const scorePreview = direction * degrees

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

        {/* Direction + Degrees — في صف واحد */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            النوع والدرجات
            {/* Live preview */}
            <span className="mr-2 font-black text-sm"
              style={{ color: scorePreview > 0 ? GREEN : RED }}>
              ({scorePreview > 0 ? '+' : ''}{scorePreview} درجة)
            </span>
          </label>
          <div className="flex gap-2">
            {/* Direction toggle */}
            <div className="flex gap-1 flex-shrink-0">
              <button type="button"
                onClick={() => setDirection(1)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                style={direction === 1
                  ? { background: `${GREEN}15`, borderColor: GREEN, color: GREEN }
                  : { borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                <ThumbsUp size={13} /> إيجابي
              </button>
              <button type="button"
                onClick={() => setDirection(-1)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                style={direction === -1
                  ? { background: `${RED}15`, borderColor: RED, color: RED }
                  : { borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                <ThumbsDown size={13} /> سلبي
              </button>
            </div>

            {/* Degrees number input */}
            <div className="flex-1 flex items-center gap-1">
              <button type="button"
                onClick={() => setDegrees(d => Math.max(1, d - 1))}
                className="w-8 h-full rounded-lg text-lg font-black text-secondary hover:text-primary hover:bg-elevated transition-colors flex items-center justify-center flex-shrink-0"
                style={{ border: '1px solid var(--border)' }}>
                −
              </button>
              <input
                type="number" min={1}
                value={degrees}
                onChange={e => setDegrees(Math.max(1, +e.target.value || 1))}
                className="we-input text-center font-black text-lg flex-1"
                style={{ color: direction === 1 ? GREEN : RED }}
              />
              <button type="button"
                onClick={() => setDegrees(d => d + 1)}
                className="w-8 h-full rounded-lg text-lg font-black text-secondary hover:text-primary hover:bg-elevated transition-colors flex items-center justify-center flex-shrink-0"
                style={{ border: '1px solid var(--border)' }}>
                +
              </button>
            </div>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            الكومنت / الملاحظة <span className="text-red-500">*</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="اكتب سبب التقييم..." className="we-input resize-none" rows={3} maxLength={300} required />
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
          disabled={!employeeId || !note.trim() || degrees < 1}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          {isEdit
            ? <><Save size={14} />حفظ التعديلات</>
            : <><Plus size={14} />إضافة تقييم ({scorePreview > 0 ? '+' : ''}{scorePreview} درجة)</>
          }
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
  const { employee, totalPositiveDeg, totalNegativeDeg, netScore, records } = summary
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])
  const name = getEmpName(employee)

  const scoreColor = netScore > 0 ? GREEN : netScore < 0 ? RED : 'var(--text-tertiary)'

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-white/[0.02] transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}>
          {name.charAt(0)}
        </div>

        {/* Name + degree bars */}
        <div className="flex-1 min-w-0 text-right">
          <p className="font-bold text-primary text-sm truncate">{name}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] font-bold" style={{ color: GREEN }}>
              +{totalPositiveDeg} درجة إيجابية
            </span>
            <span className="text-[10px] font-bold" style={{ color: RED }}>
              −{totalNegativeDeg} درجة سلبية
            </span>
            <span className="text-[10px] text-tertiary">({records.length} تقييم)</span>
          </div>
        </div>

        {/* Net score badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg font-black num px-2 py-0.5 rounded-xl"
            style={{
              color: scoreColor,
              background: netScore > 0 ? `${GREEN}12` : netScore < 0 ? `${RED}12` : 'var(--bg-elevated)',
            }}>
            {netScore > 0 ? '+' : ''}{netScore}
          </span>
          {open ? <ChevronUp size={14} className="text-tertiary" /> : <ChevronDown size={14} className="text-tertiary" />}
        </div>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {records.map(rec => {
              const br    = rec.branchId ? branchMap[rec.branchId] : null
              const isPos = rec.score > 0
              return (
                <div key={rec.id} className="px-4 py-3 flex items-start gap-3">
                  {/* Score badge */}
                  <div className="mt-0.5 flex-shrink-0 flex items-center justify-center w-10 h-6 rounded-lg text-xs font-black"
                    style={{
                      background: isPos ? `${GREEN}15` : `${RED}15`,
                      color: isPos ? GREEN : RED,
                    }}>
                    {isPos ? '+' : ''}{rec.score}
                  </div>

                  {/* Note + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary leading-relaxed">{rec.note}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-tertiary num">{fmtDate(rec.date)}</span>
                      {br && <span className="text-[10px] text-tertiary">{br.storeNameAr || br.storeName}</span>}
                      <span className="text-[10px] font-bold" style={{ color: isPos ? GREEN : RED }}>
                        {isPos ? `+${rec.score}` : rec.score} درجة
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => onEdit(rec)}
                      className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="تعديل">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => onDelete(rec.id)}
                      className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors" title="حذف">
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
            تقييم أداء الموظفين بالدرجات · تجميع شهري · سنة {year}
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
          <div className="relative mb-4">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
              style={{ right: '0.75rem' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث عن موظف..." className="we-input pr-9 w-full" />
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
