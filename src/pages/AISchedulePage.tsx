import { useState, useMemo, useCallback } from 'react'
import {
  Sparkles, Play, CheckCircle, AlertTriangle, Trash2,
  Plus, ChevronDown, ChevronUp, CalendarDays, Users,
  Info, Wand2,
} from 'lucide-react'
import { useSchedule } from '@/hooks/useSchedule'
import { storage } from '@/lib/storage'
import {
  generateAISchedule, classifyEmp, inferParity,
  GEO_ORDER, SENIOR_MALLAWY, ALL_SENIORS_MINYA,
} from '@/lib/scheduleAI'
import type {
  EmployeeAIConfig, VacationWeek, AIConfig, AIResult, AIWarning,
} from '@/lib/scheduleAI'
import type { Employee } from '@/types/hr'

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_EMPCFG  = 'ai-schedule-emp-configs'
const KEY_VACATIONS = 'ai-schedule-vacations'
const KEY_VISITS  = 'ai-schedule-visit-counts'

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

// Branch name map
const BR_NAME: Record<string, string> = {
  'br-01': 'ملوي', 'br-02': 'دير مواس', 'br-03': 'دلجا',
  'br-04': 'أبوقرقاص', 'br-05': 'المنيا', 'br-06': 'المنيا الجديدة',
  'br-07': 'بني أحمد', 'br-08': 'صفط الخمار',
}

const BRANCH_OPTIONS = GEO_ORDER.map(id => ({ id, name: BR_NAME[id] ?? id }))

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ type }: { type: 'WE' | 'IBS' }) {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
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

function SectionCard({
  title, icon: Icon, children, defaultOpen = true,
}: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className="rounded-2xl border mb-4"
      style={{ background: '#0D1527', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={17} color="#C084FC" />
          <span className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>{title}</span>
        </div>
        {open
          ? <ChevronUp size={15} color="rgba(255,255,255,0.35)" />
          : <ChevronDown size={15} color="rgba(255,255,255,0.35)" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AISchedulePage() {
  const { employees: allEmp, branches } = useSchedule('south')
  const { entries } = useSchedule('south')

  // Eligible employees: Agents + Seniors (not Supervisor)
  const eligible = useMemo(() =>
    allEmp.filter(e =>
      e.role !== 'Supervisor' &&
      (e.region ?? 'south') === 'south' &&
      (e.role === 'Agent' || e.role === 'Senior'),
    ), [allEmp])

  // ── Persisted state ────────────────────────────────────────────────────────
  const [empConfigs, setEmpConfigs] = useState<EmployeeAIConfig[]>(() => {
    const saved = storage.get<EmployeeAIConfig[]>(KEY_EMPCFG, [])
    // Merge: keep saved config, fill missing employees with defaults
    const savedMap = new Map(saved.map(c => [c.employeeId, c]))
    return (allEmp.filter(e =>
      e.role !== 'Supervisor' &&
      (e.region ?? 'south') === 'south' &&
      (e.role === 'Agent' || e.role === 'Senior'),
    )).map(emp => savedMap.get(emp.id) ?? {
      employeeId: emp.id,
      homeBranchId: emp.branchId ?? 'br-05',
      weekParity: inferParity(emp.id, entries, nextSunday()),
    })
  })

  const [vacations, setVacations] = useState<VacationWeek[]>(() =>
    storage.get<VacationWeek[]>(KEY_VACATIONS, []),
  )

  const [visitCounts, setVisitCounts] = useState<Record<string, number>>(() =>
    storage.get<Record<string, number>>(KEY_VISITS, {}),
  )

  // ── Generation state ───────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(nextSunday)
  const [weeks, setWeeks]         = useState(4)
  const [result, setResult]       = useState<AIResult | null>(null)
  const [applied, setApplied]     = useState(false)

  const { addEntries } = useSchedule('south')

  // Persist configs on change
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
    saveEmpConfigs(empConfigs.map(c =>
      c.employeeId === empId ? { ...c, ...patch } : c,
    ))
  }

  function addVacation() {
    saveVacations([...vacations, { id: uid(), employeeId: eligible[0]?.id ?? '', weekStart: nextSunday() }])
  }

  function updateVacation(id: string, patch: Partial<VacationWeek>) {
    saveVacations(vacations.map(v => v.id === id ? { ...v, ...patch } : v))
  }

  function removeVacation(id: string) {
    saveVacations(vacations.filter(v => v.id !== id))
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  function handleGenerate() {
    setApplied(false)
    const config: AIConfig = {
      startDate,
      weeks,
      empConfigs,
      vacations,
      visitCounts,
    }
    const res = generateAISchedule(allEmp, branches, config)
    setResult(res)
  }

  // ── Apply to schedule ──────────────────────────────────────────────────────
  function handleApply() {
    if (!result) return
    addEntries(result.entries)
    // Save updated visit counts
    setVisitCounts(result.visitCounts)
    storage.set(KEY_VISITS, result.visitCounts)
    setApplied(true)
  }

  // ── Separate agents vs seniors for display ────────────────────────────────
  const agentCfgs  = empConfigs.filter(c => {
    const e = allEmp.find(e => e.id === c.employeeId)
    return e?.role === 'Agent'
  })
  const seniorCfgs = empConfigs.filter(c => {
    const e = allEmp.find(e => e.id === c.employeeId)
    return e?.role === 'Senior'
  })

  // ── Warning grouped by branch ──────────────────────────────────────────────
  const warnsByBranch = useMemo(() => {
    if (!result) return {}
    const map: Record<string, AIWarning[]> = {}
    for (const w of result.warnings) {
      ;(map[w.branchId] ??= []).push(w)
    }
    return map
  }, [result])

  // ── Entry stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!result) return null
    const branch = result.entries.filter(e => e.cellType === 'branch').length
    const visit  = result.entries.filter(e => e.cellType === 'visit').length
    const annual = result.entries.filter(e => e.cellType === 'annual').length
    return { branch, visit, annual, total: result.entries.length }
  }, [result])

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

      {/* ── Section 1: Period ──────────────────────────────────────────────── */}
      <SectionCard title="فترة التوليد" icon={CalendarDays}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              تاريخ البداية (أحد)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border"
              style={{
                background: '#060C1A', borderColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.85)',
              }}
            />
            {new Date(startDate).getDay() !== 0 && (
              <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>
                ⚠ البداية لازم تكون يوم أحد
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              عدد الأسابيع
            </label>
            <select
              value={weeks}
              onChange={e => setWeeks(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border"
              style={{
                background: '#060C1A', borderColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {[1, 2, 3, 4, 6, 8, 12, 13].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'أسبوع' : n <= 10 ? 'أسابيع' : 'أسبوعاً'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info box */}
        <div
          className="mt-4 rounded-xl p-3 flex gap-2"
          style={{ background: 'rgba(107,33,168,0.12)', border: '1px solid rgba(192,132,252,0.2)' }}
        >
          <Info size={14} className="flex-shrink-0 mt-0.5" color="#C084FC" />
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <p><strong style={{ color: '#C084FC' }}>أسبوع 1:</strong> شغل أحد+اثنين+خميس+جمعة+سبت — إجازة ثلاثاء+أربعاء</p>
            <p className="mt-0.5"><strong style={{ color: '#C084FC' }}>أسبوع 2:</strong> شغل ثلاثاء+أربعاء فقط (عكس أسبوع 1)</p>
            <p className="mt-0.5"><strong style={{ color: '#C084FC' }}>WE Data:</strong> زيارة ضعف مرات IBS (نمط: WE WE IBS WE WE IBS …)</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Section 2: Vacations ───────────────────────────────────────────── */}
      <SectionCard title="إجازات الموظفين" icon={CalendarDays} defaultOpen={true}>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          كل إجازة = 5 أيام (أحد → خميس) تُحسب من الرصيد السنوي — للـ Agents فقط
        </p>

        {vacations.length === 0 && (
          <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>لا يوجد إجازات مدخلة</p>
        )}

        <div className="space-y-2 mb-3">
          {vacations.map(v => {
            const emp = allEmp.find(e => e.id === v.employeeId)
            return (
              <div
                key={v.id}
                className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ background: '#060C1A', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <select
                  value={v.employeeId}
                  onChange={e => updateVacation(v.id, { employeeId: e.target.value })}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: 'none' }}
                >
                  {eligible.filter(e => e.role === 'Agent').map(e => (
                    <option key={e.id} value={e.id}>{getEmpDisplay(e)}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={v.weekStart}
                  onChange={e => updateVacation(v.id, { weekStart: e.target.value })}
                  className="rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.8)', border: 'none',
                  }}
                />

                {emp && (
                  <Badge type={classifyEmp(emp)} />
                )}

                <button
                  onClick={() => removeVacation(v.id)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
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
          إضافة إجازة
        </button>
      </SectionCard>

      {/* ── Section 3: Employee configs ────────────────────────────────────── */}
      <SectionCard title="إعدادات الموظفين" icon={Users} defaultOpen={false}>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          حدد الفرع الأساسي لكل موظف (للتوزيع الجغرافي) ونوع الأسبوع في أول يوم توليد
        </p>

        {/* Agents */}
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Agents
        </p>
        <div className="space-y-1.5 mb-5">
          {agentCfgs.map(cfg => {
            const emp = allEmp.find(e => e.id === cfg.employeeId)
            if (!emp) return null
            const type = classifyEmp(emp)
            return (
              <div
                key={cfg.employeeId}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: '#060C1A', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <Badge type={type} />
                <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {getEmpDisplay(emp)}
                </span>
                <select
                  value={cfg.homeBranchId}
                  onChange={e => updateEmpCfg(cfg.employeeId, { homeBranchId: e.target.value })}
                  className="rounded-lg px-2 py-1 text-xs outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.7)', border: 'none',
                    minWidth: 110,
                  }}
                >
                  {BRANCH_OPTIONS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  {([1, 2] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => updateEmpCfg(cfg.employeeId, { weekParity: p })}
                      className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                      style={{
                        background: cfg.weekParity === p
                          ? 'rgba(107,33,168,0.4)' : 'rgba(255,255,255,0.05)',
                        color: cfg.weekParity === p ? '#C084FC' : 'rgba(255,255,255,0.35)',
                      }}
                    >
                      W{p}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Seniors */}
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Seniors
        </p>
        <div className="space-y-1.5">
          {seniorCfgs.map(cfg => {
            const emp = allEmp.find(e => e.id === cfg.employeeId)
            if (!emp) return null
            const isMallawy = cfg.employeeId === SENIOR_MALLAWY
            void ALL_SENIORS_MINYA // used for classification context
            return (
              <div
                key={cfg.employeeId}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: '#060C1A', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {getEmpDisplay(emp)}
                </span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: isMallawy
                      ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                    color: isMallawy ? '#86EFAC' : '#FCD34D',
                  }}
                >
                  {isMallawy ? 'ملوي ثابت' : 'دوري المنيا'}
                </span>
                {!isMallawy && (
                  <div className="flex gap-1">
                    {([1, 2] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => updateEmpCfg(cfg.employeeId, { weekParity: p })}
                        className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                        style={{
                          background: cfg.weekParity === p
                            ? 'rgba(107,33,168,0.4)' : 'rgba(255,255,255,0.05)',
                          color: cfg.weekParity === p ? '#C084FC' : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        W{p}
                      </button>
                    ))}
                  </div>
                )}
                {isMallawy && (
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>W1 دائماً</span>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* ── Generate Button ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={handleGenerate}
          disabled={new Date(startDate).getDay() !== 0}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all active:scale-95"
          style={{
            background: new Date(startDate).getDay() === 0
              ? 'linear-gradient(135deg,#6B21A8,#4C1D95)'
              : 'rgba(255,255,255,0.07)',
            color: new Date(startDate).getDay() === 0
              ? 'white' : 'rgba(255,255,255,0.25)',
            boxShadow: new Date(startDate).getDay() === 0
              ? '0 4px 24px rgba(107,33,168,0.4)' : 'none',
            cursor: new Date(startDate).getDay() === 0 ? 'pointer' : 'not-allowed',
          }}
        >
          <Wand2 size={22} />
          توليد الجدول بالذكاء الاصطناعي
        </button>
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {result && (
        <div
          className="rounded-2xl border mb-6"
          style={{ background: '#0D1527', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {/* Stats bar */}
          {stats && (
            <div
              className="grid grid-cols-3 divide-x divide-x-reverse border-b px-5 py-4"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <Stat label="إدخالات فرع" value={stats.branch} color="#C084FC" />
              <Stat label="زيارات خارجية" value={stats.visit} color="#FCD34D" />
              <Stat label="إجازات سنوية" value={stats.annual} color="#86EFAC" />
            </div>
          )}

          <div className="px-5 py-4 space-y-5">
            {/* Weekly visits */}
            {result.weekVisits.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  توزيع الزيارات الخارجية
                </p>
                <div className="space-y-1.5">
                  {result.weekVisits.map((wv, i) => {
                    const empName = getEmpDisplay(wv.employee)
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl"
                        style={{ background: '#060C1A', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div>
                          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                            {empName}
                          </span>
                          <span className="text-[10px] ml-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {fmtDate(wv.weekStart)}
                          </span>
                        </div>
                        <Badge type={wv.empType} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} color="#FCD34D" />
                  <p className="text-xs font-bold" style={{ color: '#FCD34D' }}>
                    {result.warnings.length} تحذير — نقص في التغطية
                  </p>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {Object.entries(warnsByBranch).map(([brId, warns]) => (
                    <div
                      key={brId}
                      className="p-2.5 rounded-xl"
                      style={{ background: 'rgba(252,211,77,0.07)', border: '1px solid rgba(252,211,77,0.15)' }}
                    >
                      <p className="text-xs font-bold mb-1" style={{ color: '#FCD34D' }}>
                        {BR_NAME[brId] ?? brId} — {warns.length} يوم ناقص
                      </p>
                      {warns.slice(0, 3).map((w, i) => (
                        <p key={i} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {fmtDate(w.date)} — محتاج {w.need} / وجد {w.got}
                        </p>
                      ))}
                      {warns.length > 3 && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
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

            {/* Apply button */}
            {!applied ? (
              <button
                onClick={handleApply}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm transition-all active:scale-95"
                style={{
                  background: 'rgba(34,197,94,0.15)',
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
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(134,239,172,0.2)' }}
              >
                <CheckCircle size={16} color="#86EFAC" />
                <span className="text-sm font-bold" style={{ color: '#86EFAC' }}>
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
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          قواعد التوليد
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1.5 gap-x-6">
          {[
            ['🏠', 'التوزيع على أساس أقرب فرع جغرافياً'],
            ['🔁', 'دوران شهري للسينيورز بين المنيا والمنيا الجديدة'],
            ['👁', 'زيارة خارجية: موظف واحد/أسبوع من المنيا'],
            ['⚖', 'WE Data يعمل فيزيت ضعف عدد IBS (2:1)'],
            ['🏢', 'دلجا + بني أحمد + صفط: IBS فقط، 9→4'],
            ['⚡', 'الزيادة في الموظفين تروح للمنيا (2-3)'],
          ].map(([icon, text]) => (
            <div key={text as string} className="flex items-center gap-2">
              <span>{icon}</span>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center px-3">
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
    </div>
  )
}
