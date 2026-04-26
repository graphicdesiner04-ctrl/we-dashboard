import { useState, useMemo } from 'react'
import { Clock, Search, Pencil, Trash2, ChevronDown, ChevronUp, HardDrive, RotateCcw } from 'lucide-react'
import PermissionKPICards from '@/components/hr/PermissionKPICards'
import PermissionForm     from '@/components/hr/PermissionForm'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/context/AuthContext'
import { filterByViewRole } from '@/lib/roleFilter'
import { getEmpName }     from '@/data/seedData'
import type { PermissionRecord, Branch } from '@/types/hr'
import type { PermissionInput } from '@/hooks/usePermissions'

const WE    = '#6B21A8'
const LIMIT = 4

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
}

function monthLabel(key: string) {
  return new Date(key + '-01T00:00:00').toLocaleString('ar-EG', { month: 'long', year: 'numeric' })
}

function r2(n: number) { return Math.round(n * 100) / 100 }

// ── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct  = Math.min(100, (used / limit) * 100)
  const over = used > limit
  return (
    <div className="w-full rounded-full overflow-hidden flex-1" style={{ height: 5, background: 'var(--bg-elevated)' }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: over ? '#DC2626' : WE,
        borderRadius: 9999, transition: 'width 0.3s',
      }} />
    </div>
  )
}

// ── Employee card inside a month section ──────────────────────────────────

function EmpMonthCard({
  employeeId, monthRecords, employees, branches, onEdit, onDelete,
}: {
  employeeId:   string
  monthRecords: PermissionRecord[]
  employees:    ReturnType<typeof usePermissions>['employees']
  branches:     Branch[]
  onEdit:   (r: PermissionRecord) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const employee  = employees.find(e => e.id === employeeId)
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])
  const monthHours = r2(monthRecords.reduce((s, r) => s + r.decimalHours, 0))
  const isOverLimit = monthHours > LIMIT
  const name    = employee ? getEmpName(employee) : employeeId
  const initial = name.charAt(0)

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}>
          {initial}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-primary text-sm">{name}</span>
            {isOverLimit && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#DC262615', color: '#DC2626' }}>تجاوز الحد</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar used={monthHours} limit={LIMIT} />
            <span className="text-xs font-black num flex-shrink-0"
              style={{ color: isOverLimit ? '#DC2626' : WE }}>
              {monthHours}/{LIMIT}h
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 mr-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${WE}18`, color: WE }}>
            {monthRecords.length}
          </span>
          {open
            ? <ChevronUp  size={14} className="text-tertiary" />
            : <ChevronDown size={14} className="text-tertiary" />
          }
        </div>
      </button>

      {open && (
        <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
          {monthRecords.map(rec => {
            const branch = branchMap[rec.branchId]
            return (
              <div key={rec.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-0.5">
                    <span className="text-xs font-bold text-primary num">{fmtDate(rec.date)}</span>
                    {rec.fromTime && (
                      <span className="text-[10px] text-secondary num">
                        {rec.fromTime}{rec.toTime ? ` ← ${rec.toTime}` : ''}
                      </span>
                    )}
                    <span className="text-[10px] font-black num" style={{ color: WE }}>
                      {rec.hours > 0 && rec.minutes > 0
                        ? `${rec.hours}h ${rec.minutes}m`
                        : rec.hours > 0
                          ? `${rec.hours}h`
                          : `${rec.minutes}m`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {branch && (
                      <span className="text-[10px] text-tertiary">
                        {branch.storeNameAr || branch.storeName}
                      </span>
                    )}
                    {rec.note && (
                      <span className="text-[10px] text-tertiary truncate max-w-[220px]" title={rec.note}>
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
  )
}

// ── Month section ─────────────────────────────────────────────────────────

function MonthSection({
  monthKey, records, employees, branches, search, onEdit, onDelete,
}: {
  monthKey:  string
  records:   PermissionRecord[]
  employees: ReturnType<typeof usePermissions>['employees']
  branches:  Branch[]
  search:    string
  onEdit:    (r: PermissionRecord) => void
  onDelete:  (id: string) => void
}) {
  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const [open, setOpen] = useState(monthKey === currentMonthKey)

  // group records by employee within this month
  const byEmp = useMemo(() => {
    const map = new Map<string, PermissionRecord[]>()
    for (const rec of records) {
      const arr = map.get(rec.employeeId) ?? []
      arr.push(rec)
      map.set(rec.employeeId, arr)
    }
    return [...map.entries()]
      .map(([empId, recs]) => ({ empId, recs: recs.sort((a, b) => b.date.localeCompare(a.date)) }))
      .filter(({ empId }) => {
        if (!search.trim()) return true
        const emp = employees.find(e => e.id === empId)
        return emp ? getEmpName(emp).toLowerCase().includes(search.toLowerCase()) : false
      })
      .sort((a, b) => {
        const ah = r2(a.recs.reduce((s, r) => s + r.decimalHours, 0))
        const bh = r2(b.recs.reduce((s, r) => s + r.decimalHours, 0))
        return bh - ah
      })
  }, [records, employees, search])

  const totalHours = r2(records.reduce((s, r) => s + r.decimalHours, 0))
  const isCurrentMonth = monthKey === currentMonthKey
  const label = monthLabel(monthKey)

  return (
    <div className="card overflow-hidden mb-4">
      {/* Month header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 flex items-center gap-3 flex-wrap text-right">
          <span className="font-black text-sm text-primary">{label}</span>
          {isCurrentMonth && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: WE }}>
              الشهر الحالي
            </span>
          )}
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${WE}15`, color: WE }}>
              {records.length} سجل
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
              {totalHours}h
            </span>
          </div>
        </div>
        {open
          ? <ChevronUp  size={15} className="text-tertiary flex-shrink-0" />
          : <ChevronDown size={15} className="text-tertiary flex-shrink-0" />
        }
      </button>

      {/* Employee sub-cards */}
      {open && (
        <div className="border-t px-3 py-3 grid grid-cols-1 xl:grid-cols-2 gap-3"
          style={{ borderColor: 'var(--border)' }}>
          {byEmp.length === 0 ? (
            <p className="text-xs text-tertiary text-center py-4 col-span-2">لا توجد نتائج</p>
          ) : byEmp.map(({ empId, recs }) => (
            <EmpMonthCard
              key={empId}
              employeeId={empId}
              monthRecords={recs}
              employees={employees}
              branches={branches}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { session } = useAuth()
  const {
    employees, branches, records, currentMonthRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
  } = usePermissions()

  // Role-based visibility filter
  const visEmps = useMemo(
    () => filterByViewRole(employees, session?.role),
    [employees, session?.role],
  )
  const visIds = useMemo(() => new Set(visEmps.map(e => e.id)), [visEmps])
  const visRecords             = useMemo(() => records.filter(r => visIds.has(r.employeeId)), [records, visIds])
  const visCurrentMonthRecords = useMemo(() => currentMonthRecords.filter(r => visIds.has(r.employeeId)), [currentMonthRecords, visIds])
  const visSummaries           = useMemo(() => summaries.filter(s => visIds.has(s.employee.id)), [summaries, visIds])
  const visKpi = useMemo(() => {
    const totalUsed = Math.round(visSummaries.reduce((s, e) => s + e.totalDecimalHours, 0) * 100) / 100
    return {
      ...kpi,
      totalEmployees:     visEmps.length,
      totalUsedHours:     totalUsed,
      totalRemainingHours: Math.max(0, visEmps.length * 4 - totalUsed),
      employeesOverLimit:  visSummaries.filter(s => s.isOverLimit).length,
    }
  }, [visSummaries, visEmps, kpi])

  const [editing, setEditing] = useState<PermissionRecord | null>(null)
  const [search,  setSearch]  = useState('')

  function handleSubmit(data: PermissionInput) {
    if (editing) { updateRecord(editing.id, data); setEditing(null) }
    else          addRecord(data)
  }

  function handleEdit(rec: PermissionRecord) {
    setEditing(rec)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذا السجل؟')) deleteRecord(id)
  }

  function handleReset() {
    if (window.confirm('سيتم حذف جميع سجلات الأذونات. هل أنت متأكد؟')) {
      resetRecords(); setEditing(null)
    }
  }

  // Group visible records by month, newest first
  const monthBuckets = useMemo(() => {
    const map = new Map<string, PermissionRecord[]>()
    for (const rec of visRecords) {
      const key = rec.date.slice(0, 7)
      const arr = map.get(key) ?? []
      arr.push(rec)
      map.set(key, arr)
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
  }, [records])

  const month = new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' })

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.14)' }}>
              <Clock size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">ساعات الإذن</h1>
          </div>
          <p className="text-sm text-secondary">إدارة وتتبع أذونات الموظفين الشهرية · {month}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Clock size={12} />
          <span>الحد: 4 ساعات / شهر</span>
        </div>
      </div>

      <PermissionKPICards kpi={visKpi} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5">

        {/* Left: form + utils */}
        <div className="flex flex-col gap-4 lg:self-start lg:sticky lg:top-[72px]">
          <PermissionForm
            employees={visEmps} branches={branches} summaries={visSummaries}
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
            <button onClick={handleReset} disabled={visRecords.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: '#DC2626' }}>
              <Trash2 size={13} /><span>حذف سجلات الأذونات</span>
            </button>
            <button onClick={() => { resetRecords(); setEditing(null); setSearch('') }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-elevated"
              style={{ color: 'var(--text-secondary)' }}>
              <RotateCcw size={13} /><span>إعادة تعيين الكل</span>
            </button>
          </div>
        </div>

        {/* Right: monthly sections */}
        <div className="min-w-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
              style={{ right: '0.75rem' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث عن موظف في كل الشهور..."
              className="we-input pr-9 w-full"
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-primary">السجلات حسب الشهر</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${WE}15`, color: WE }}>
                {visRecords.length} سجل إجمالي
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                {visCurrentMonthRecords.length} هذا الشهر
              </span>
            </div>
          </div>

          {monthBuckets.length === 0 ? (
            <div className="card p-12 flex flex-col items-center gap-3 text-center">
              <Clock size={38} className="text-tertiary" strokeWidth={1.4} />
              <p className="text-secondary font-semibold text-sm">لا توجد سجلات أذونات</p>
              <p className="text-tertiary text-xs">ابدأ بتسجيل أول إذن من النموذج</p>
            </div>
          ) : (
            monthBuckets.map(([key, recs]) => (
              <MonthSection
                key={key}
                monthKey={key}
                records={recs}
                employees={employees}
                branches={branches}
                search={search}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
