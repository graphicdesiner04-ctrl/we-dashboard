import { useState, useMemo, useCallback } from 'react'
import {
  Sparkles, Play, CheckCircle, AlertTriangle, Trash2,
  Plus, ChevronDown, ChevronUp, CalendarDays, Users,
  Info, Wand2, Shuffle, Download, Eye, BarChart2, UserX,
} from 'lucide-react'
import { useSchedule } from '@/hooks/useSchedule'
import { storage } from '@/lib/storage'
import {
  generateAISchedule, classifyEmp, inferShift,
  GEO_ORDER, SENIOR_MALLAWY, ALL_SENIORS_MINYA,
  DEFAULT_HOME_BRANCHES, autoAssignVacations, calcWeekOffset,
  MAX_GEO_BY_HOME,
} from '@/lib/scheduleAI'
import type {
  EmployeeAIConfig, VacationWeek, AIConfig, AIResult, AIWarning, ShiftType,
} from '@/lib/scheduleAI'
import type { Employee } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'
import { exportAIScheduleXlsx } from '@/lib/exportScheduleXlsx'

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_EMPCFG    = 'ai-schedule-emp-configs'
const KEY_VACATIONS = 'ai-schedule-vacations'
const KEY_VISITS    = 'ai-schedule-visit-counts'
const KEY_INACTIVE  = 'ai-schedule-inactive'

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

/** الفروع المسموح جغرافياً للموظف بناءً على فرعه الأصلي */
function getAllowedBranches(homeId: string): string[] {
  const homePos = GEO_ORDER.indexOf(homeId)
  const maxDist = MAX_GEO_BY_HOME[homeId] ?? 2
  return GEO_ORDER.filter((_, i) => Math.abs(i - homePos) <= maxDist)
}

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
  const { employees: allEmp, branches, addEntries } = useSchedule('south')

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
    return eligible.map(emp => {
      const existing = savedMap.get(emp.id)
      // دعم التوافق مع الإصدار القديم (cycleOffset) وإعادة بناء shift
      const shift: ShiftType =
        existing && 'shift' in existing && (existing.shift === 'A' || existing.shift === 'B')
          ? existing.shift as ShiftType
          : inferShift(emp.id)
      return {
        employeeId:   emp.id,
        homeBranchId: existing?.homeBranchId ?? DEFAULT_HOME_BRANCHES[emp.id] ?? emp.branchId ?? 'br-05',
        shift,
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

  // ── Inactive employees (منقولون / موقفون) ──────────────────────────────────
  const [inactiveIds, setInactiveIds] = useState<string[]>(() =>
    storage.get<string[]>(KEY_INACTIVE, []),
  )

  function toggleInactive(empId: string) {
    const next = inactiveIds.includes(empId)
      ? inactiveIds.filter(id => id !== empId)
      : [...inactiveIds, empId]
    setInactiveIds(next)
    storage.set(KEY_INACTIVE, next)
    setResult(null)
  }

  // ── Generation params ──────────────────────────────────────────────────────
  const [startDate, setStartDate]   = useState(nextSunday)
  const [weeks, setWeeks]           = useState(13)
  const [autoVac, setAutoVac]       = useState(true)
  const [result, setResult]         = useState<AIResult | null>(null)
  const [applied, setApplied]       = useState(false)
  const [resultTab, setResultTab]   = useState<'summary' | 'preview'>('summary')

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
    setResult(null)
  }

  function updateEmpPriority(empId: string, idx: number, brId: string) {
    const cfg  = empConfigs.find(c => c.employeeId === empId)
    if (!cfg) return
    const pris = Array.from({ length: 3 }, (_, i) => cfg.branchPriorities?.[i] ?? '')
    pris[idx]  = brId
    saveEmpConfigs(
      empConfigs.map(c => c.employeeId === empId
        ? { ...c, branchPriorities: pris.filter(Boolean) }
        : c,
      ),
    )
    setResult(null)
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
      inactiveEmployees: inactiveIds,
    }
    setResult(generateAISchedule(allEmp, branches, config))
  }

  const weekOffsetInfo = useMemo(() => calcWeekOffset(startDate), [startDate])

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
            <p><strong style={{ color: '#C084FC' }}>شيفت A (أسبوع 1):</strong> سبت + ثلاثاء + أربعاء</p>
            <p><strong style={{ color: '#FCD34D' }}>شيفت B (أسبوع 1):</strong> أحد + اثنين + خميس + جمعة</p>
            <p style={{ color: 'rgba(255,255,255,0.3)' }}>الأسبوع 2: يتعكسان — الترتيب: فروع صغيرة ← دير/جديدة ← ملوي/أبوقرقاص ← فيزيت ← المنيا</p>
            <p style={{ marginTop: 4, color: weekOffsetInfo === 0 ? '#86EFAC' : '#FCD34D' }}>
              <strong>تتابع الأسابيع:</strong>{' '}
              {weekOffsetInfo === 0
                ? '✓ يبدأ من نفس نقطة المرجع (B ثقيل)'
                : '↔ مُعاد ضبطه — الأسبوع الأول سيكون A ثقيل'}
            </p>
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
      <SectionCard
        title={`إعدادات الموظفين${inactiveIds.length ? ` — ${inactiveIds.length} موقف` : ''}`}
        icon={Users}
        defaultOpen={false}
      >
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
          الفرع الأساسي لكل موظف وشيفت البداية (A أو B) — يتعكسان كل أسبوع.{' '}
          <span style={{ color: '#FCA5A5' }}>أيقونة <UserX size={10} className="inline" /> تعني الموظف منقول ولا يدخل التوزيع.</span>
        </p>

        {/* Agents */}
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.22)' }}>
          Agents — {agentCfgs.length} موظف
        </p>
        <div className="space-y-1.5 mb-5">
          {agentCfgs.map(cfg => {
            const emp      = allEmp.find(e => e.id === cfg.employeeId)
            if (!emp) return null
            const inactive = inactiveIds.includes(cfg.employeeId)
            const allowed  = getAllowedBranches(cfg.homeBranchId)
            const pris     = cfg.branchPriorities ?? []
            return (
              <div
                key={cfg.employeeId}
                className="rounded-xl p-2.5"
                style={{
                  background: inactive ? 'rgba(239,68,68,0.06)' : '#060C1A',
                  border: `1px solid ${inactive ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)'}`,
                  opacity: inactive ? 0.7 : 1,
                }}
              >
                {/* ── الصف الرئيسي ── */}
                <div className="flex items-center gap-2">
                  <Badge type={classifyEmp(emp)} />
                  <span
                    className={`flex-1 text-xs font-semibold truncate ${inactive ? 'line-through' : ''}`}
                    style={{ color: inactive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)' }}
                  >
                    {getEmpDisplay(emp)}
                  </span>
                  {!inactive && (
                    <>
                      <select
                        value={cfg.homeBranchId}
                        onChange={e => updateEmpCfg(cfg.employeeId, { homeBranchId: e.target.value })}
                        className="rounded-lg px-2 py-1 text-xs outline-none flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: 'none', minWidth: 100 }}
                      >
                        {BRANCH_OPTIONS.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <ShiftToggle
                        value={cfg.shift ?? 'A'}
                        onChange={s => updateEmpCfg(cfg.employeeId, { shift: s })}
                      />
                    </>
                  )}
                  {inactive && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}
                    >منقول</span>
                  )}
                  <button
                    onClick={() => toggleInactive(cfg.employeeId)}
                    title={inactive ? 'إعادة تفعيل الموظف' : 'إيقاف — الموظف منقول'}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{
                      background: inactive ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                      color: inactive ? '#FCA5A5' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <UserX size={12} />
                  </button>
                </div>

                {/* ── أولوية التغطية (3 فروع مرتَّبة) ── */}
                {!inactive && (
                  <div className="flex items-center gap-1.5 mt-1.5 pr-1">
                    <span className="text-[9px] font-bold flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      أولوية:
                    </span>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center gap-0.5 flex-shrink-0">
                        <span
                          className="text-[8px] font-black w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: pris[i]
                              ? 'rgba(192,132,252,0.25)'
                              : 'rgba(255,255,255,0.06)',
                            color: pris[i] ? '#C084FC' : 'rgba(255,255,255,0.2)',
                          }}
                        >
                          {i + 1}
                        </span>
                        <select
                          value={pris[i] ?? ''}
                          onChange={e => updateEmpPriority(cfg.employeeId, i, e.target.value)}
                          className="rounded outline-none text-[10px]"
                          style={{
                            background: pris[i] ? 'rgba(192,132,252,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${pris[i] ? 'rgba(192,132,252,0.2)' : 'rgba(255,255,255,0.07)'}`,
                            color: pris[i] ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                            padding: '1px 4px',
                            minWidth: 72,
                          }}
                        >
                          <option value="">— غير محدد</option>
                          {allowed.map(brId => (
                            <option key={brId} value={brId}>{BR_NAME[brId] ?? brId}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {pris.length > 0 && (
                      <button
                        onClick={() => updateEmpCfg(cfg.employeeId, { branchPriorities: [] })}
                        className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.07)' }}
                        title="مسح الأولويات"
                      >
                        مسح
                      </button>
                    )}
                  </div>
                )}
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
                    value={cfg.shift ?? 'A'}
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
          {/* Stats bar */}
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

          {/* Tabs */}
          <div
            className="flex border-b px-5 gap-1 pt-3"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            {([
              { id: 'summary', label: 'ملخص',         icon: BarChart2 },
              { id: 'preview', label: 'معاينة الجدول', icon: Eye       },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setResultTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-colors"
                style={{
                  color:       resultTab === tab.id ? '#C084FC' : 'rgba(255,255,255,0.35)',
                  background:  resultTab === tab.id ? 'rgba(107,33,168,0.15)' : 'transparent',
                  borderBottom: resultTab === tab.id ? '2px solid #C084FC' : '2px solid transparent',
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Summary tab ── */}
          {resultTab === 'summary' && (
            <div className="px-5 py-4 space-y-5">

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

              <ApplyButton applied={applied} onApply={handleApply} />
            </div>
          )}

          {/* ── Preview tab ── */}
          {resultTab === 'preview' && (
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {result.entries.length} خلية — {weeks} أسبوع من {startDate}
                </p>
                <button
                  onClick={() => exportAIScheduleXlsx(eligible, branches, result.entries, startDate, weeks)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                  style={{
                    background: 'rgba(34,197,94,0.14)',
                    border: '1px solid rgba(134,239,172,0.25)',
                    color: '#86efac',
                  }}
                >
                  <Download size={13} />
                  تصدير Excel
                </button>
              </div>

              <AIPreviewMatrix
                startDate={startDate}
                weeks={weeks}
                employees={eligible}
                branches={branches}
                entries={result.entries}
              />

              <ApplyButton applied={applied} onApply={handleApply} />
            </div>
          )}
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
            ['1️⃣', 'دلجا + بني أحمد + صفط: IBS ثابت، سبت–خميس، 9→16'],
            ['2️⃣', 'دير مواس + المنيا الجديدة: 1 يومياً، شيفتان أسبوعياً'],
            ['3️⃣', 'ملوي + أبوقرقاص: 2 يومياً، شيفتان، تعويض من الأقرب'],
            ['4️⃣', 'الفيزيت: أسبوع كامل أحد–خميس، WE ضعف IBS (2:1)'],
            ['5️⃣', 'المنيا: تستوعب كل الفائض، 2 وكلاء كحد أدنى يومياً'],
            ['🔁', 'السينيورز خارج الحساب — دوران شهري بين المنيا والجديدة'],
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

// ── Apply button (reused in both tabs) ───────────────────────────────────────

function ApplyButton({ applied, onApply }: { applied: boolean; onApply: () => void }) {
  if (applied) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-3.5 rounded-xl"
        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(134,239,172,0.2)' }}
      >
        <CheckCircle size={16} color="#86EFAC" />
        <span className="text-sm font-black" style={{ color: '#86EFAC' }}>تم تطبيق الجدول بنجاح ✓</span>
      </div>
    )
  }
  return (
    <button
      onClick={onApply}
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
  )
}

// ── Branch colors (mirror SchedulePage) ──────────────────────────────────────

const PREVIEW_CELL: Record<string, { bg: string; fg: string; short: string }> = {
  'br-01': { bg: 'rgba(255,0,0,0.22)',     fg: '#ff9999', short: 'ملوى'      },
  'br-02': { bg: 'rgba(112,48,160,0.28)',  fg: '#c084fc', short: 'دير مواس'  },
  'br-03': { bg: 'rgba(100,221,109,0.20)', fg: '#64dd6d', short: 'دلجا'      },
  'br-04': { bg: 'rgba(0,102,0,0.30)',     fg: '#4ade80', short: 'ابوقرقاص'  },
  'br-05': { bg: 'rgba(128,0,0,0.32)',     fg: '#fca5a5', short: 'المنيا'    },
  'br-06': { bg: 'rgba(255,255,0,0.16)',   fg: '#fde047', short: 'منيا ج.'   },
  'br-07': { bg: 'rgba(82,124,3,0.30)',    fg: '#bef264', short: 'بني أحمد'  },
  'br-08': { bg: 'rgba(0,64,128,0.30)',    fg: '#93c5fd', short: 'صفط'       },
}

function previewCellStyle(entry: ScheduleInput): { bg: string; fg: string; label: string } {
  const ct = entry.cellType ?? 'branch'
  if (ct === 'branch' && entry.branchId) {
    const s = PREVIEW_CELL[entry.branchId]
    return s ? { bg: s.bg, fg: s.fg, label: s.short } : { bg: 'rgba(107,33,168,0.2)', fg: '#c084fc', label: entry.branchId }
  }
  if (ct === 'visit')  return { bg: 'rgba(245,158,11,0.18)',  fg: '#fcd34d', label: 'زيارة' }
  if (ct === 'off')    return { bg: 'rgba(75,85,99,0.28)',    fg: '#9ca3af', label: 'Off'   }
  if (ct === 'annual') return { bg: 'rgba(245,158,11,0.22)',  fg: '#fbbf24', label: 'سنوي'  }
  if (ct === 'sick')   return { bg: 'rgba(239,68,68,0.22)',   fg: '#fca5a5', label: 'مريض'  }
  if (ct === 'swap')   return { bg: 'rgba(20,184,166,0.22)',  fg: '#5eead4', label: '↔'     }
  return { bg: 'transparent', fg: '#4b5563', label: '' }
}

// ── Preview matrix ────────────────────────────────────────────────────────────

function AIPreviewMatrix({
  startDate, weeks, employees, branches: _branches, entries,
}: {
  startDate: string
  weeks: number
  employees: Employee[]
  branches: { id: string; storeNameAr?: string; storeName: string }[]
  entries: ScheduleInput[]
}) {
  const days = useMemo(() => {
    const result: string[] = []
    const d = new Date(startDate + 'T00:00:00')
    for (let i = 0; i < weeks * 7; i++) {
      result.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }
    return result
  }, [startDate, weeks])

  const entryIndex = useMemo(() => {
    const m: Record<string, ScheduleInput> = {}
    for (const e of entries) m[`${e.employeeId}|${e.date}`] = e
    return m
  }, [entries])

  const agents  = useMemo(() => employees.filter(e => e.role !== 'Senior'), [employees])
  const seniors = useMemo(() => employees.filter(e => e.role === 'Senior'), [employees])
  const cols    = useMemo<(Employee | null)[]>(() => [...agents, null, ...seniors], [agents, seniors])

  const DOW_AR = ['أحد','اثنين','ثلاث','أربع','خميس','جمعة','سبت']
  const COL_W  = 72, DATE_W = 72, ROW_H = 44
  const bg     = '#060C1A', border = 'rgba(255,255,255,0.07)'

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520, borderRadius: 12, border: `1px solid ${border}` }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: `${DATE_W + cols.length * COL_W}px` }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 40, width: DATE_W, background: '#0D1527', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}`, padding: '4px 6px', textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>التاريخ</span>
            </th>
            {cols.map((emp) => emp === null ? (
              <th key="__sep__" style={{ position: 'sticky', top: 0, zIndex: 30, width: 16, background: '#111', borderBottom: `1px solid #222` }} />
            ) : (
              <th key={emp.id} style={{ position: 'sticky', top: 0, zIndex: 30, width: COL_W, background: '#0D1527', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}`, padding: '3px 2px', textAlign: 'center', verticalAlign: 'bottom' }}>
                <p style={{ fontSize: 9, color: '#C084FC', fontWeight: 900 }}>{emp.employeeCode}</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', lineHeight: 1.2, overflow: 'hidden', maxHeight: 22 }}>
                  {(emp.nameEn || emp.name || emp.user).split(' ')[0]}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(date => {
            const dow  = new Date(date + 'T00:00:00').getDay()
            const isFri = dow === 5
            const isSat = dow === 6
            const rowBg = isFri ? 'rgba(255,204,0,0.06)' : isSat ? 'rgba(255,255,255,0.02)' : bg
            return (
              <tr key={date}>
                <td style={{ position: 'sticky', left: 0, zIndex: 10, width: DATE_W, background: rowBg, borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}`, padding: '2px 4px', textAlign: 'center', height: ROW_H }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: isFri ? '#d97706' : 'rgba(255,255,255,0.4)' }}>{DOW_AR[dow]}</p>
                  <p style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>{date.slice(5)}</p>
                </td>
                {cols.map((emp) => emp === null ? (
                  <td key="__sep__" style={{ width: 16, background: '#111', borderBottom: `1px solid #1a1a1a` }} />
                ) : (
                  <td key={emp.id} style={{ width: COL_W, height: ROW_H, borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}`, padding: 2, background: rowBg }}>
                    {(() => {
                      const entry = entryIndex[`${emp.id}|${date}`]
                      if (!entry) return null
                      const cs = previewCellStyle(entry)
                      if (!cs.label) return null
                      return (
                        <div style={{ background: cs.bg, color: cs.fg, borderRadius: 5, padding: '2px 3px', fontSize: 9, fontWeight: 700, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {cs.label}
                        </div>
                      )
                    })()}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Shift toggle (A / B) ──────────────────────────────────────────────────────

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
