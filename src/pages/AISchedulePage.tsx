import { useState, useMemo, useCallback } from 'react'
import {
  Sparkles, Play, CheckCircle, AlertTriangle, Trash2,
  Plus, ChevronDown, ChevronUp, CalendarDays, Users,
  Info, Wand2, Shuffle,
} from 'lucide-react'
import { useSchedule } from '@/hooks/useSchedule'
import { storage } from '@/lib/storage'
import {
  generateAISchedule, classifyEmp, inferShift,
  GEO_ORDER, SENIOR_MALLAWY, ALL_SENIORS_MINYA,
  DEFAULT_HOME_BRANCHES, autoAssignVacations,
} from '@/lib/scheduleAI'
import type {
  EmployeeAIConfig, VacationWeek, AIConfig, AIResult, AIWarning,
  ShiftType,
} from '@/lib/scheduleAI'
import type { Employee } from '@/types/hr'

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_EMPCFG    = 'ai-schedule-emp-configs'
const KEY_VACATIONS = 'ai-schedule-vacations'
const KEY_VISITS    = 'ai-schedule-visit-counts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextSunday(): string {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7))
  return d.toISOString().slice(0, 10)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
}

function getEmpDisplay(emp: Employee): string {
  return emp.name || emp.nameEn || emp.domainName || emp.user
}

function uid(): string {
  return `vac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
}

const BR_NAME: Record<string, string> = {
  'br-01': 'ملوي', 'br-02': 'دير مواس', 'br-03': 'دلجا',
  'br-04': 'أبوقرقاص', 'br-05': 'المنيا', 'br-06': 'المنيا الجديدة',
  'br-07': 'بني أحمد', 'br-08': 'صفط الخمار',
}

const BRANCH_OPTIONS = GEO_ORDER.map(id => ({ id, name: BR_NAME[id] ?? id }))

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ type }: { type: 'WE' | 'IBS' }) {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{
        background: type === 'WE' ? 'rgba(107,33,168,0.25)' : 'rgba(234,179,8,0.18)',
        color:      type === 'WE' ? '#C084FC' : '#FCD34D',
        border:     `1px solid ${type === 'WE' ? 'rgba(192,132,252,0.3)' : 'rgba(252,211,77,0.3)'}`,
      }}
    >
      {type}
    </span>
  )
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, children, defaultOpen = true,
  extra,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
  extra?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className="rounded-2xl border mb-4"
      style={{ background: '#0D1527', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 flex-1 text-right"
        >
          <Icon size={17} color="#C084FC" />
          <span className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>{title}</span>
          <span className="mr-auto">
            {open
              ? <ChevronUp size={14} color="rgba(255,255,255,0.35)" />
              : <ChevronDown size={14} color="rgba(255,255,255,0.35)" />}
          </span>
        </button>
        {extra && <div className="mr-3">{extra}</div>}
      </div>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center px-3">
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AISchedulePage() {
  const { employees: allEmp, branches, entries, addEntries } = useSchedule('south')

  // Eligible: Agents + Seniors (not Supervisor), south only
  const eligible = useMemo(() =>
    allEmp.filter(e =>
      e.role !== 'Supervisor' &&
      (e.region ?? 'south') === 'south' &&
      (e.role === 'Agent' || e.role === 'Senior'),
    ), [allEmp])

  const agentList = useMemo(() => eligible.filter(e => e.role === 'Agent'), [eligible])

  // ── Persisted emp configs ──────────────────────────────────────────────────
  const [empConfigs, setEmpConfigs] = useState<EmployeeAIConfig[]>(() => {
    const saved    = storage.get<EmployeeAIConfig[]>(KEY_EMPCFG, [])
    const savedMap = new Map(saved.map(c => [c.employeeId, c]))
    const startRef = nextSunday()
    return eligible.map(emp => {
      const existing = savedMap.get(emp.id)
      return existing ?? {
        employeeId:   emp.id,
        homeBranchId: DEFAULT_HOME_BRANCHES[emp.id] ?? emp.branchId ?? 'br-05',
        shift:        inferShift(emp.id, entries, startRef),
      }
    })
  })

  // ── Persisted vacations ────────────────────────────────────────────────────
  const [vacations, setVacations] = useState<VacationWeek[]>(() =>
    storage.get<VacationWeek[]>(KEY_VACATIONS, []),
  )

  // ── Persisted visit counts ─────────────────────────────────────────────────
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>(() =>
    storage.get<Record<string, number>>(KEY_VISITS, {}),
  )

  // ── Generation params ──────────────────────────────────────────────────────
  const [startDate, setStartDate]   = useState(nextSunday)
  const [weeks, setWeeks]           = useState(13)
  const [autoVac, setAutoVac]       = useState(true)
  const [result, setResult]         = useState<AIResult | null>(null)
  const [applied, setApplied]       = useState(false)

  // ── Persistence helpers ────────────────────────────────────────────────────
  const saveEmpConfigs = useCallback((cfgs: EmployeeAIConfig[]) => {
    setEmpConfigs(cfgs)
    storage.set(KEY_EMPCFG, cfgs)
  }, [])

  const saveVacations = useCallback((vacs: VacationWeek[]) => {
    setVacations(vacs)
    storage.set(KEY_VACATIONS, vacs)
  }, [])

  // ── Config handlers ────────────────────────────────────────────────────────
  function updateEmpCfg(empId: string, patch: Partial<EmployeeAIConfig>) {
    saveEmpConfigs(empConfigs.map(c => c.employeeId === empId ? { ...c, ...patch } : c))
  }

  function addVacation() {
    const v: VacationWeek = {
      id: uid(),
      employeeId: agentList[0]?.id ?? '',
      weekStart:  nextSunday(),
    }
    saveVacations([...vacations, v])
  }

  function updateVacation(id: string, patch: Partial<VacationWeek>) {
    saveVacations(vacations.map(v => v.id === id ? { ...v, ...patch } : v))
  }

  function removeVacation(id: string) {
    saveVacations(vacations.filter(v => v.id !== id))
  }

  // Preview auto-vacations without generating
  function handlePreviewAutoVac() {
    const preview = autoAssignVacations(agentList, vacations, startDate, weeks)
    saveVacations([...vacations, ...preview])
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  function handleGenerate() {
    setApplied(false)
    const config: AIConfig = {
      startDate, weeks, empConfigs, vacations,
      visitCounts, autoVacation: autoVac,
    }
    setResult(generateAISchedule(allEmp, branches, config))
  }

  // ── Apply ──────────────────────────────────────────────────────────────────
  function handleApply() {
    if (!result) return
    addEntries(result.entries)
    setVisitCounts(result.visitCounts)
    storage.set(KEY_VISITS, result.visitCounts)
    // Merge auto-vacations into stored vacations so they persist
    if (result.autoVacationsAdded.length) {
      saveVacations([...vacations, ...result.autoVacationsAdded])
    }
    setApplied(true)
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const agentCfgs  = empConfigs.filter(c => allEmp.find(e => e.id === c.employeeId)?.role === 'Agent')
  const seniorCfgs = empConfigs.filter(c => allEmp.find(e => e.id === c.employeeId)?.role === 'Senior')

  const warnsByBranch = useMemo(() => {
    if (!result) return {} as Record<string, AIWarning[]>
    return result.warnings.reduce<Record<string, AIWarning[]>>((acc, w) => {
      ;(acc[w.branchId] ??= []).push(w)
      return acc
    }, {})
  }, [result])

  const stats = useMemo(() => {
    if (!result) return null
    return {
      branch: result.entries.filter(e => e.cellType === 'branch').length,
      visit:  result.entries.filter(e => e.cellType === 'visit').length,
      annual: result.entries.filter(e => e.cellType === 'annual').length,
    }
  }, [result])

  const isSunday = new Date(startDate).getDay() === 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto" dir="rtl">

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}
        >
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>
            توليد جدول ذكي
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            AI Schedule Generator — المنطقة الجنوبية
          </p>
        </div>
      </div>

      {/* ── 1. Period ───────────────────────────────────────────────────── */}
      <SectionCard title="فترة التوليد" icon={CalendarDays}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              تاريخ البداية (لازم أحد)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setResult(null) }}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border"
              style={{
                background: '#060C1A', borderColor: isSunday ? 'rgba(255,255,255,0.1)' : 'rgba(252,100,100,0.4)',
                color: 'rgba(255,255,255,0.85)',
              }}
            />
            {!isSunday && (
              <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>⚠ لازم يكون يوم أحد</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              عدد الأسابيع
            </label>
            <select
              value={weeks}
              onChange={e => { setWeeks(Number(e.target.value)); setResult(null) }}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border"
              style={{ background: '#060C1A', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
            >
              {[1,2,3,4,6,8,12,13].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'أسبوع' : n <= 10 ? 'أسابيع' : 'أسبوعاً'} {n === 13 ? '(ربع سنة)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto vacation toggle */}
        <button
          onClick={() => setAutoVac(v => !v)}
          className="flex items-center gap-2.5 w-full p-3 rounded-xl transition-colors"
          style={{
            background: autoVac ? 'rgba(107,33,168,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${autoVac ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <div
            className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
            style={{ background: autoVac ? '#6B21A8' : 'rgba(255,255,255,0.15)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: autoVac ? '18px' : '2px' }}
            />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold" style={{ color: autoVac ? '#C084FC' : 'rgba(255,255,255,0.5)' }}>
              توزيع إجازات سنوية تلقائي
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              كل موظف يأخذ أسبوع إجازة لو لم يتم إدخالها يدوياً — توزيع متوازن
            </p>
          </div>
        </button>

        {/* Shift info */}
        <div
          className="mt-3 rounded-xl p-3 flex gap-2"
          style={{ background: 'rgba(107,33,168,0.1)', border: '1px solid rgba(192,132,252,0.15)' }}
        >
          <Info size={14} className="flex-shrink-0 mt-0.5" color="#C084FC" />
          <div className="text-xs space-y-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <p><strong style={{ color: '#C084FC' }}>شيفت A:</strong> سبت + ثلاثاء + أربعاء</p>
            <p><strong style={{ color: '#FCD34D' }}>شيفت B:</strong> أحد + اثنين + خميس + جمعة</p>
            <p style={{ color: 'rgba(255,255,255,0.3)' }}>يتعكسوا مع بعض كل أسبوع — WE فيزيت ضعف IBS (2:1)</p>
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Vacations ────────────────────────────────────────────────── */}
      <SectionCard
        title={`إجازات الموظفين${vacations.length ? ` (${vacations.length})` : ''}`}
        icon={CalendarDays}
        extra={
          <button
            onClick={handlePreviewAutoVac}
            className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-colors"
            style={{
              background: 'rgba(107,33,168,0.2)',
              border: '1px solid rgba(192,132,252,0.25)',
              color: '#C084FC',
            }}
            title="توزيع إجازات متوازن تلقائياً للموظفين الذين ليس لديهم إجازة"
          >
            <Shuffle size={12} />
            توزيع تلقائي
          </button>
        }
      >
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
          كل إجازة = 5 أيام أحد→خميس تُحسب من الرصيد السنوي — للـ Agents فقط
        </p>

        {vacations.length === 0 && (
          <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            لا يوجد إجازات مدخلة — يمكن استخدام "توزيع تلقائي" أو إضافة يدوياً
          </p>
        )}

        <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
          {vacations.map(v => {
            const emp = allEmp.find(e => e.id === v.employeeId)
            const isAuto = v.id.startsWith('auto-')
            return (
              <div
                key={v.id}
                className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{
                  background: isAuto ? 'rgba(107,33,168,0.08)' : '#060C1A',
                  border: `1px solid ${isAuto ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {isAuto && (
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'rgba(192,132,252,0.2)', color: '#C084FC' }}
                  >تلقائي</span>
                )}
                <select
                  value={v.employeeId}
                  onChange={e => updateVacation(v.id, { employeeId: e.target.value })}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs outline-none min-w-0"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: 'none' }}
                >
                  {agentList.map(e => (
                    <option key={e.id} value={e.id}>{getEmpDisplay(e)}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={v.weekStart}
                  onChange={e => updateVacation(v.id, { weekStart: e.target.value })}
                  className="rounded-lg px-2 py-1.5 text-xs outline-none flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: 'none' }}
                />

                {emp && <Badge type={classifyEmp(emp)} />}

                <button
                  onClick={() => removeVacation(v.id)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={addVacation}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-white/5"
          style={{ color: '#C084FC', border: '1px dashed rgba(192,132,252,0.3)' }}
        >
          <Plus size={13} />
          إضافة إجازة يدوياً
        </button>
      </SectionCard>

      {/* ── 3. Employee configs ──────────────────────────────────────────── */}
      <SectionCard title="إعدادات الموظفين" icon={Users} defaultOpen={false}>
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
          الفرع الأساسي لكل موظف (للتوزيع الجغرافي) وشيفت البداية عند أول أسبوع توليد
        </p>

        {/* Agents */}
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.22)' }}>
          Agents — {agentCfgs.length} موظف
        </p>
        <div className="space-y-1.5 mb-5">
          {agentCfgs.map(cfg => {
            const emp = allEmp.find(e => e.id === cfg.employeeId)
            if (!emp) return null
            return (
              <div
                key={cfg.employeeId}
                className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ background: '#060C1A', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <Badge type={classifyEmp(emp)} />
                <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {getEmpDisplay(emp)}
                </span>
                <select
                  value={cfg.homeBranchId}
                  onChange={e => updateEmpCfg(cfg.employeeId, { homeBranchId: e.target.value })}
                  className="rounded-lg px-2 py-1 text-xs outline-none flex-shrink-0"
                  style={{
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)',
                    border: 'none', minWidth: 105,
                  }}
                >
                  {BRANCH_OPTIONS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <ShiftToggle
                  value={cfg.shift}
                  onChange={s => updateEmpCfg(cfg.employeeId, { shift: s })}
                />
              </div>
            )
          })}
        </div>

        {/* Seniors */}
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.22)' }}>
          Seniors
        </p>
        <div className="space-y-1.5">
          {seniorCfgs.map(cfg => {
            const emp = allEmp.find(e => e.id === cfg.employeeId)
            if (!emp) return null
            const isMallawy = cfg.employeeId === SENIOR_MALLAWY
            const isMinya   = ALL_SENIORS_MINYA.includes(cfg.employeeId)
            return (
              <div
                key={cfg.employeeId}
                className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ background: '#060C1A', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {getEmpDisplay(emp)}
                </span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: isMallawy ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                    color: isMallawy ? '#86EFAC' : '#FCD34D',
                  }}
                >
                  {isMallawy ? 'ملوي ثابت' : isMinya ? 'دوري المنيا' : 'سينيور'}
                </span>
                {!isMallawy && (
                  <ShiftToggle
                    value={cfg.shift}
                    onChange={s => updateEmpCfg(cfg.employeeId, { shift: s })}
                  />
                )}
                {isMallawy && (
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    أحد–خميس
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* ── Generate button ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={handleGenerate}
          disabled={!isSunday}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all active:scale-[0.98]"
          style={{
            background: isSunday
              ? 'linear-gradient(135deg,#6B21A8,#4C1D95)'
              : 'rgba(255,255,255,0.06)',
            color:      isSunday ? 'white' : 'rgba(255,255,255,0.2)',
            boxShadow:  isSunday ? '0 4px 24px rgba(107,33,168,0.4)' : 'none',
            cursor:     isSunday ? 'pointer' : 'not-allowed',
          }}
        >
          <Wand2 size={22} />
          توليد الجدول بالذكاء الاصطناعي
        </button>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result && (
        <div
          className="rounded-2xl border mb-6"
          style={{ background: '#0D1527', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {/* Stats */}
          {stats && (
            <div
              className="grid grid-cols-3 border-b px-5 py-4"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <Stat label="إدخالات فرع"   value={stats.branch} color="#C084FC" />
              <Stat label="زيارات خارجية" value={stats.visit}  color="#FCD34D" />
              <Stat label="إجازات سنوية"  value={stats.annual} color="#86EFAC" />
            </div>
          )}

          <div className="px-5 py-4 space-y-5">

            {/* Auto vacations info */}
            {result.autoVacationsAdded.length > 0 && (
              <div
                className="p-3 rounded-xl flex items-start gap-2"
                style={{ background: 'rgba(107,33,168,0.12)', border: '1px solid rgba(192,132,252,0.2)' }}
              >
                <Sparkles size={14} color="#C084FC" className="flex-shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  تم توزيع إجازات تلقائية على{' '}
                  <strong style={{ color: '#C084FC' }}>{result.autoVacationsAdded.length}</strong>
                  {' '}موظف بشكل متوازن عبر الفترة
                </p>
              </div>
            )}

            {/* Weekly visits */}
            {result.weekVisits.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  توزيع الزيارات الخارجية
                </p>
                <div className="space-y-1.5">
                  {result.weekVisits.map((wv, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl"
                      style={{ background: '#060C1A', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold truncate block" style={{ color: 'rgba(255,255,255,0.8)' }}>
                          {getEmpDisplay(wv.employee)}
                        </span>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {fmtDate(wv.weekStart)}
                        </span>
                      </div>
                      <Badge type={wv.empType} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} color="#FCD34D" />
                  <p className="text-xs font-bold" style={{ color: '#FCD34D' }}>
                    {result.warnings.length} تحذير — نقص تغطية
                  </p>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {Object.entries(warnsByBranch).map(([brId, warns]) => (
                    <div
                      key={brId}
                      className="p-2.5 rounded-xl"
                      style={{ background: 'rgba(252,211,77,0.06)', border: '1px solid rgba(252,211,77,0.15)' }}
                    >
                      <p className="text-xs font-bold mb-1" style={{ color: '#FCD34D' }}>
                        {BR_NAME[brId] ?? brId} — {warns.length} يوم
                      </p>
                      {warns.slice(0, 3).map((w, i) => (
                        <p key={i} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {fmtDate(w.date)} ← محتاج {w.need} / وُجد {w.got}
                        </p>
                      ))}
                      {warns.length > 3 && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          +{warns.length - 3} أيام أخرى
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle size={14} color="#86EFAC" />
                <p className="text-xs font-semibold" style={{ color: '#86EFAC' }}>
                  لا يوجد تحذيرات — التغطية مكتملة ✓
                </p>
              </div>
            )}

            {/* Apply / Done */}
            {!applied ? (
              <button
                onClick={handleApply}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
                style={{
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(134,239,172,0.3)',
                  color: '#86EFAC',
                }}
              >
                <Play size={16} />
                تطبيق الجدول على السيستم
              </button>
            ) : (
              <div
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(134,239,172,0.2)' }}
              >
                <CheckCircle size={16} color="#86EFAC" />
                <span className="text-sm font-black" style={{ color: '#86EFAC' }}>
                  تم تطبيق الجدول بنجاح ✓
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="rounded-2xl border p-4"
        style={{ background: '#0D1527', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
          قواعد التوليد
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1.5 gap-x-6">
          {[
            ['🏠', 'التوزيع على أساس أقرب فرع جغرافياً لكل موظف'],
            ['🔁', 'دوران شهري للسينيورز بين المنيا والمنيا الجديدة'],
            ['👁',  'زيارة خارجية: موظف واحد في الأسبوع من المنيا'],
            ['⚖',  'WE Data يعمل فيزيت ضعف IBS (2 WE : 1 IBS)'],
            ['🏢', 'دلجا + بني أحمد + صفط: IBS فقط، 9→16، سبت–خميس'],
            ['🏖', 'كل موظف يأخذ أسبوع إجازة كل ربع سنة تلقائياً'],
          ].map(([icon, text]) => (
            <div key={text as string} className="flex items-center gap-2">
              <span className="text-sm">{icon}</span>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Shift toggle component ────────────────────────────────────────────────────

function ShiftToggle({ value, onChange }: { value: ShiftType; onChange: (s: ShiftType) => void }) {
  return (
    <div className="flex gap-1 flex-shrink-0">
      {(['A', 'B'] as ShiftType[]).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className="text-xs font-black px-2.5 py-1 rounded-lg transition-colors"
          style={{
            background: value === s
              ? s === 'A' ? 'rgba(107,33,168,0.45)' : 'rgba(234,179,8,0.25)'
              : 'rgba(255,255,255,0.05)',
            color: value === s
              ? s === 'A' ? '#C084FC' : '#FCD34D'
              : 'rgba(255,255,255,0.28)',
          }}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
