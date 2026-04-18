import { useState, useMemo } from 'react'
import { Calendar, Search, Pencil, Trash2, ChevronDown, ChevronUp, HardDrive, RotateCcw } from 'lucide-react'
import AnnualLeaveKPICards from '@/components/hr/AnnualLeaveKPICards'
import AnnualLeaveForm     from '@/components/hr/AnnualLeaveForm'
import { useAnnualLeave }  from '@/hooks/useAnnualLeave'
import { getEmpName }      from '@/data/seedData'
import { ANNUAL_LEAVE_DAYS } from '@/types/hr'
import type { AnnualLeaveRecord, AnnualLeaveSummary, Branch } from '@/types/hr'
import type { AnnualLeaveInput } from '@/hooks/useAnnualLeave'

const WE = '#6B21A8'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct  = Math.min(100, (used / limit) * 100)
  const over = used > limit
  return (
    <div className="w-full rounded-full overflow-hidden flex-1" style={{ height: 5, background: 'var(--bg-elevated)' }}>
      <div
        style={{
          width: `${pct}%`, height: '100%',
          background: over ? '#DC2626' : WE,
          borderRadius: 9999, transition: 'width 0.3s',
        }}
      />
    </div>
  )
}

// ── Employee leave card ───────────────────────────────────────────────────

function EmployeeCard({
  summary, records, branches, onEdit, onDelete,
}: {
  summary:  AnnualLeaveSummary
  records:  AnnualLeaveRecord[]
  branches: Branch[]
  onEdit:   (r: AnnualLeaveRecord) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(records.length > 0)
  const { employee, totalDaysUsed, isOverLimit } = summary
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])
  const initial   = getEmpName(employee).charAt(0)

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-primary text-sm">{getEmpName(employee)}</span>
            {isOverLimit && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#DC262615', color: '#DC2626' }}>
                تجاوز الحد
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar used={totalDaysUsed} limit={ANNUAL_LEAVE_DAYS} />
            <span className="text-xs font-black num flex-shrink-0"
              style={{ color: isOverLimit ? '#DC2626' : WE }}>
              {totalDaysUsed}/{ANNUAL_LEAVE_DAYS}d
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 mr-1">
          {records.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${WE}18`, color: WE }}>
              {records.length}
            </span>
          )}
          {open
            ? <ChevronUp  size={14} className="text-tertiary" />
            : <ChevronDown size={14} className="text-tertiary" />
          }
        </div>
      </button>

      {/* Records list */}
      {open && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {records.length === 0 ? (
            <p className="px-4 py-3 text-xs text-tertiary text-center">لا توجد إجازات هذه السنة</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {records.map(rec => {
                const branch = branchMap[rec.branchId]
                return (
                  <div key={rec.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-0.5">
                        <span className="text-xs font-bold text-primary num">{fmtDate(rec.date)}</span>
                        <span className="text-[10px] font-black num" style={{ color: WE }}>
                          {rec.days} {rec.days === 1 ? 'يوم' : 'أيام'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {branch && (
                          <span className="text-[10px] text-tertiary">
                            {branch.storeNameAr || branch.storeName}
                          </span>
                        )}
                        {rec.note && (
                          <span className="text-[10px] text-tertiary truncate max-w-[180px]" title={rec.note}>
                            {rec.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
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
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AnnualLeavePage() {
  const {
    employees, branches, records, currentYearRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
  } = useAnnualLeave()

  const [editing, setEditing] = useState<AnnualLeaveRecord | null>(null)
  const [search,  setSearch]  = useState('')

  function handleSubmit(data: AnnualLeaveInput) {
    if (editing) { updateRecord(editing.id, data); setEditing(null) }
    else          addRecord(data)
  }

  function handleEdit(rec: AnnualLeaveRecord) {
    setEditing(rec)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذا السجل؟')) deleteRecord(id)
  }

  function handleReset() {
    if (window.confirm('سيتم حذف جميع سجلات الإجازة السنوية. هل أنت متأكد؟')) {
      resetRecords(); setEditing(null)
    }
  }

  const year = new Date().getFullYear()

  // Per-employee records map (current year only)
  const empRecords = useMemo(() => {
    const map: Record<string, AnnualLeaveRecord[]> = {}
    for (const emp of employees) {
      map[emp.id] = currentYearRecords.filter(r => r.employeeId === emp.id)
    }
    return map
  }, [employees, currentYearRecords])

  // Filter + sort
  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? summaries.filter(s => getEmpName(s.employee).toLowerCase().includes(q))
      : summaries
    return [...filtered].sort((a, b) => {
      const ar = empRecords[a.employee.id]?.length ?? 0
      const br = empRecords[b.employee.id]?.length ?? 0
      return br - ar
    })
  }, [summaries, search, empRecords])

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.14)' }}>
              <Calendar size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">الإجازة السنوية</h1>
          </div>
          <p className="text-sm text-secondary">إدارة وتتبع أيام الإجازة السنوية · سنة {year}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Calendar size={12} />
          <span>الحد: 21 يوم / سنة</span>
        </div>
      </div>

      <AnnualLeaveKPICards kpi={kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5">

        {/* Left: form + utils */}
        <div className="flex flex-col gap-4 lg:self-start lg:sticky lg:top-[72px]">
          <AnnualLeaveForm
            employees={employees} branches={branches} summaries={summaries}
            editingRecord={editing} onSubmit={handleSubmit}
            onCancelEdit={() => setEditing(null)} onEmployeeSelect={() => {}}
          />

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
            <HardDrive size={12} style={{ color: WE, opacity: 0.7 }} />
            <span>يتم الحفظ تلقائياً على هذا الجهاز</span>
          </div>

          <div className="card p-3 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-1">إعادة التعيين</p>
            <button onClick={handleReset} disabled={records.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: '#DC2626' }}>
              <Trash2 size={13} /><span>حذف سجلات الإجازة</span>
            </button>
            <button onClick={() => { resetRecords(); setEditing(null); setSearch('') }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-elevated"
              style={{ color: 'var(--text-secondary)' }}>
              <RotateCcw size={13} /><span>إعادة تعيين الكل</span>
            </button>
          </div>
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
            <span className="text-xs text-tertiary">{sorted.length} موظف</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {sorted.map(summary => (
              <EmployeeCard
                key={summary.employee.id}
                summary={summary}
                records={empRecords[summary.employee.id] ?? []}
                branches={branches}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
