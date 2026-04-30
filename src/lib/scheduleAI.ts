// ── WE AI Schedule Generator ─────────────────────────────────────────────────
// Algorithmic schedule generation for South region.
// Rules: FINAL SYSTEM doc 2026-04-30 — rewritten 2026-04-30 (geo-order fix)

import type { Employee, Branch } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'

// ── Geography: strictly south → north ────────────────────────────────────────
// دلجا → دير مواس → ملوي → أبوقرقاص → بني أحمد → صفط الخمار → المنيا الجديدة → المنيا
export const GEO_ORDER = [
  'br-03', // دلجا            (0 — southernmost)
  'br-02', // دير مواس        (1)
  'br-01', // ملوي             (2)
  'br-04', // أبوقرقاص        (3)
  'br-07', // بني أحمد        (4)
  'br-08', // صفط الخمار      (5)
  'br-06', // المنيا الجديدة   (6)
  'br-05', // المنيا           (7 — northernmost / absorbs surplus)
]

// Small branches: IBS only, open Sat–Thu (closed Fri), 9–16
export const SMALL_BRANCHES = new Set(['br-03', 'br-07', 'br-08'])

// Branch requirements: [min, max, ibsOnly]
// br-05 has high max — absorbs all remaining available agents
const BRANCH_NEEDS: Record<string, [number, number, boolean]> = {
  'br-03': [1, 1,  true ],  // دلجا         — small, IBS only
  'br-02': [1, 1,  false],  // دير مواس
  'br-01': [1, 1,  false],  // ملوي          (+senior already placed)
  'br-04': [2, 2,  false],  // أبوقرقاص
  'br-07': [1, 1,  true ],  // بني أحمد     — small, IBS only
  'br-08': [1, 1,  true ],  // صفط الخمار   — small, IBS only
  'br-06': [1, 1,  false],  // المنيا الجديدة
  'br-05': [2, 99, false],  // المنيا        — absorbs all surplus
}

// ── Fixed senior assignments ──────────────────────────────────────────────────
export const SENIOR_MALLAWY = 'emp-15'               // Ahmed Hassan — fixed ملوي, Sun–Thu
export const SENIORS_MINYA_A = ['emp-13', 'emp-16']  // pair A → br-05 even months
export const SENIORS_MINYA_B = ['emp-14', 'emp-17']  // pair B → br-06 even months
export const ALL_SENIORS_MINYA = [...SENIORS_MINYA_A, ...SENIORS_MINYA_B]

// ── Shift day sets (JS: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat) ───────────
const SHIFT_A = new Set([6, 2, 3])       // Sat + Tue + Wed  (3 days)
const SHIFT_B = new Set([0, 1, 4, 5])    // Sun + Mon + Thu + Fri  (4 days)
const SENIOR_MALLAWY_DAYS = new Set([0, 1, 2, 3, 4]) // Sun–Thu fixed
const SMALL_OPEN = new Set([0, 1, 2, 3, 4, 6])        // Sat–Thu (no Fri)

// ── Default home branches per employee ───────────────────────────────────────
export const DEFAULT_HOME_BRANCHES: Record<string, string> = {
  // دلجا (br-03)
  'emp-26': 'br-03', // احمد صلاح

  // دير مواس (br-02)
  'emp-21': 'br-02', // محمد ربيع
  'emp-38': 'br-02', // احمد راوي
  'emp-31': 'br-02', // احمد محمد حسن اسماعيل

  // ملوي (br-01)
  'emp-24': 'br-01', // محمود جمال
  'emp-28': 'br-01', // وليد احمد
  'emp-23': 'br-01', // فادي عطا

  // أبوقرقاص (br-04)
  'emp-34': 'br-04', // محمد يسري
  'emp-30': 'br-04', // احمد ظريف
  'emp-37': 'br-04', // هاني محسن
  'emp-12': 'br-04', // روماني عيسى

  // بني أحمد (br-07)
  'emp-41': 'br-07', // محمد ناصر

  // صفط الخمار (br-08)
  'emp-22': 'br-08', // محمد جابر

  // المنيا (br-05)
  'emp-27': 'br-05', // احمد محمود احمد
  'emp-19': 'br-05', // عاصم جمال
  'emp-20': 'br-05', // محمود حمدي
  'emp-29': 'br-05', // مصطفى عبد الكافي
  'emp-32': 'br-05', // محمد احمد سيد
  'emp-33': 'br-05', // محمود محمد اسماعيل
  'emp-18': 'br-05', // وائل محمد

  // المنيا الجديدة (br-06)
  'emp-36': 'br-06', // محمد عبد العظيم
  'emp-25': 'br-06', // عبد الرحمن محمد
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmployeeType = 'WE' | 'IBS'
export type ShiftType = 'A' | 'B'

export interface EmployeeAIConfig {
  employeeId: string
  homeBranchId: string
  shift: ShiftType
}

export interface VacationWeek {
  id: string
  employeeId: string
  weekStart: string // ISO Sunday — covers Mon–Fri (5 days)
}

export interface AIConfig {
  startDate: string
  weeks: number
  empConfigs: EmployeeAIConfig[]
  vacations: VacationWeek[]
  visitCounts: Record<string, number>
  autoVacation: boolean
}

export interface AIWarning {
  date: string
  branchId: string
  branchNameAr: string
  need: number
  got: number
}

export interface WeekVisitInfo {
  weekStart: string
  employee: Employee
  empType: EmployeeType
}

export interface AIResult {
  entries: ScheduleInput[]
  warnings: AIWarning[]
  visitCounts: Record<string, number>
  weekVisits: WeekVisitInfo[]
  autoVacationsAdded: VacationWeek[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function classifyEmp(emp: Employee): EmployeeType {
  return /\d/.test(emp.user) ? 'IBS' : 'WE'
}

function geoIdx(brId: string): number {
  const i = GEO_ORDER.indexOf(brId)
  return i < 0 ? 4 : i // default to middle if unknown
}

function geoDist(a: string, b: string): number {
  return Math.abs(geoIdx(a) - geoIdx(b))
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekDates(sun: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i))
}

function dow(iso: string): number {
  return new Date(iso + 'T00:00:00').getDay()
}

function getSunday(iso: string): string {
  const d   = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

// ── Auto vacation balancer ────────────────────────────────────────────────────

export function autoAssignVacations(
  agents: Employee[],
  existingVacations: VacationWeek[],
  startDate: string,
  weeks: number,
): VacationWeek[] {
  const added: VacationWeek[] = []
  const allSundays = Array.from({ length: weeks }, (_, i) => addDays(startDate, i * 7))
  const periodStart = startDate
  const periodEnd   = addDays(startDate, weeks * 7 - 1)

  const coveredEmpIds = new Set(
    existingVacations
      .filter(v => v.weekStart >= periodStart && v.weekStart <= periodEnd)
      .map(v => v.employeeId),
  )

  const needVacation = agents.filter(e => !coveredEmpIds.has(e.id))
  if (!needVacation.length) return []

  const weekLoad: Record<string, number> = {}
  for (const sun of allSundays) weekLoad[sun] = 0
  for (const v of existingVacations) {
    if (allSundays.includes(v.weekStart)) {
      weekLoad[v.weekStart] = (weekLoad[v.weekStart] ?? 0) + 1
    }
  }

  const maxPerWeek = Math.ceil((needVacation.length + existingVacations.length) / weeks) + 1
  const shuffled   = [...needVacation].sort(() => Math.random() - 0.5)

  for (const emp of shuffled) {
    const available = allSundays.filter(sun => (weekLoad[sun] ?? 0) < maxPerWeek)
    if (!available.length) continue
    available.sort((a, b) => (weekLoad[a] ?? 0) - (weekLoad[b] ?? 0))
    const minLoad   = weekLoad[available[0]] ?? 0
    const candidates = available.filter(s => (weekLoad[s] ?? 0) === minLoad)
    const chosen    = candidates[Math.floor(Math.random() * candidates.length)]
    weekLoad[chosen] = (weekLoad[chosen] ?? 0) + 1
    added.push({ id: `auto-${emp.id}-${chosen}`, employeeId: emp.id, weekStart: chosen })
  }

  return added
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateAISchedule(
  employees: Employee[],
  branches: Branch[],
  config: AIConfig,
): AIResult {
  const entries: ScheduleInput[]    = []
  const warnings: AIWarning[]       = []
  const visitCounts                 = { ...config.visitCounts }
  const weekVisits: WeekVisitInfo[] = []

  const brMap  = new Map(branches.map(b => [b.id, b]))
  const cfgMap = new Map(config.empConfigs.map(c => [c.employeeId, c]))

  const eligible = employees.filter(e =>
    e.role !== 'Supervisor' && (e.region ?? 'south') === 'south',
  )
  const agents    = eligible.filter(e => e.role === 'Agent')
  const ibsAgents = agents.filter(e => classifyEmp(e) === 'IBS')

  // ── Home branch lookup ──────────────────────────────────────────────────────
  function getHome(emp: Employee): string {
    return cfgMap.get(emp.id)?.homeBranchId
      ?? DEFAULT_HOME_BRANCHES[emp.id]
      ?? emp.branchId
      ?? 'br-05'
  }

  // ── Auto-vacation ───────────────────────────────────────────────────────────
  let allVacations = [...config.vacations]
  let autoVacationsAdded: VacationWeek[] = []
  if (config.autoVacation) {
    autoVacationsAdded = autoAssignVacations(
      agents, config.vacations, config.startDate, config.weeks,
    )
    allVacations = [...allVacations, ...autoVacationsAdded]
  }

  // Build vacation-day lookup: "empId:date" → true
  const vacDays = new Set<string>()
  for (const v of allVacations) {
    for (let i = 0; i < 5; i++) {
      const d = addDays(v.weekStart, i)
      vacDays.add(`${v.employeeId}:${d}`)
      entries.push({
        employeeId: v.employeeId,
        date: d,
        cellType: 'annual',
        note: autoVacationsAdded.some(a => a.id === v.id)
          ? 'AI — إجازة سنوية (تلقائي)'
          : 'AI — إجازة سنوية',
      })
    }
  }

  // ── Visit pools (employees eligible for external visits) ───────────────────
  // Only employees whose home is NOT a small branch can do visits
  const visitPool   = agents.filter(e => !SMALL_BRANCHES.has(getHome(e)))
  const weVisit     = visitPool.filter(e => classifyEmp(e) === 'WE')
  const ibsVisit    = visitPool.filter(e => classifyEmp(e) === 'IBS')

  // ── Shift helpers ───────────────────────────────────────────────────────────
  function empShift(empId: string, weekOffset: number): ShiftType {
    if (empId === SENIOR_MALLAWY) return 'A'
    const base = cfgMap.get(empId)?.shift ?? 'A'
    return ((base === 'A' ? 0 : 1) + weekOffset) % 2 === 0 ? 'A' : 'B'
  }

  function isWorkDay(empId: string, date: string, weekOffset: number): boolean {
    if (empId === SENIOR_MALLAWY) return SENIOR_MALLAWY_DAYS.has(dow(date))
    const s = empShift(empId, weekOffset)
    return s === 'A' ? SHIFT_A.has(dow(date)) : SHIFT_B.has(dow(date))
  }

  function isAvailable(empId: string, date: string): boolean {
    return !vacDays.has(`${empId}:${date}`)
  }

  // ── Visit selector: WE:IBS = 2:1 ───────────────────────────────────────────
  const usedAsVisit = new Set<string>()
  function pickVisit(): Employee | null {
    const weTotal  = weVisit.reduce((s, e)  => s + (visitCounts[e.id]  ?? 0), 0)
    const ibsTotal = ibsVisit.reduce((s, e) => s + (visitCounts[e.id]  ?? 0), 0)
    const pickWE   = ibsTotal === 0 || weTotal / Math.max(ibsTotal, 1) < 2
    const pool     = (pickWE ? weVisit : ibsVisit).filter(e => !usedAsVisit.has(e.id))
    if (!pool.length) return null
    return pool.reduce((best, e) =>
      (visitCounts[e.id] ?? 0) < (visitCounts[best.id] ?? 0) ? e : best,
    )
  }

  // ── Week loop ───────────────────────────────────────────────────────────────
  for (let w = 0; w < config.weeks; w++) {
    const sun   = addDays(config.startDate, w * 7)
    const dates = weekDates(sun)

    // Minya senior pairing — swap every month relative to start month
    const startMonth = new Date(config.startDate + 'T00:00:00').getMonth()
    const curMonth   = new Date(sun + 'T00:00:00').getMonth()
    const swapped    = ((curMonth - startMonth + 12) % 12) % 2 === 1
    const pairBr05   = swapped ? SENIORS_MINYA_B : SENIORS_MINYA_A
    const pairBr06   = swapped ? SENIORS_MINYA_A : SENIORS_MINYA_B

    // Visit employee for this week
    const visitEmp = pickVisit()
    if (visitEmp) {
      usedAsVisit.add(visitEmp.id)
      visitCounts[visitEmp.id] = (visitCounts[visitEmp.id] ?? 0) + 1
      weekVisits.push({ weekStart: sun, employee: visitEmp, empType: classifyEmp(visitEmp) })
    }

    // ── Daily loop ────────────────────────────────────────────────────────────
    for (const date of dates) {
      const d       = dow(date)
      const usedToday = new Set<string>()

      // ── 1. Visit employee ────────────────────────────────────────────────
      if (visitEmp && isWorkDay(visitEmp.id, date, w) && isAvailable(visitEmp.id, date)) {
        entries.push({
          employeeId: visitEmp.id,
          date,
          cellType: 'visit',
          note: 'AI — زيارة خارجية',
        })
        usedToday.add(visitEmp.id)
      }

      // ── 2. Senior Mallawy — fixed ملوي Sun–Thu ──────────────────────────
      if (SENIOR_MALLAWY_DAYS.has(d) && isAvailable(SENIOR_MALLAWY, date)) {
        entries.push({
          employeeId: SENIOR_MALLAWY,
          branchId: 'br-01',
          date,
          cellType: 'branch',
          startTime: '09:00',
          endTime: '21:00',
          note: 'AI — سينيور ملوي',
        })
        usedToday.add(SENIOR_MALLAWY)
      }

      // ── 3. Rotating Minya seniors ────────────────────────────────────────
      for (const sid of pairBr05) {
        if (isWorkDay(sid, date, w) && isAvailable(sid, date)) {
          entries.push({
            employeeId: sid, branchId: 'br-05', date, cellType: 'branch',
            startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا',
          })
          usedToday.add(sid)
        }
      }
      for (const sid of pairBr06) {
        if (isWorkDay(sid, date, w) && isAvailable(sid, date)) {
          entries.push({
            employeeId: sid, branchId: 'br-06', date, cellType: 'branch',
            startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا الجديدة',
          })
          usedToday.add(sid)
        }
      }

      // ── 4. Assign all branches in geographic order south → north ─────────
      // GEO_ORDER: br-03 → br-02 → br-01 → br-04 → br-07 → br-08 → br-06 → br-05
      for (const brId of GEO_ORDER) {
        const [min, max, ibsOnly] = BRANCH_NEEDS[brId] ?? [1, 1, false]
        const isSmall = SMALL_BRANCHES.has(brId)

        // Small branches are closed on Friday
        if (isSmall && !SMALL_OPEN.has(d)) continue

        const br = brMap.get(brId)

        // Pick from IBS pool (small branches) or all agents (main branches)
        // Sort by geographic proximity to this branch (nearest first)
        const candidatePool = (ibsOnly ? ibsAgents : agents)
          .filter(e =>
            !usedToday.has(e.id) &&
            isAvailable(e.id, date) &&
            isWorkDay(e.id, date, w),
          )
          .sort((a, b) => {
            const distA = geoDist(getHome(a), brId)
            const distB = geoDist(getHome(b), brId)
            if (distA !== distB) return distA - distB
            // Tie-break: prefer employees whose home IS this branch
            const aHome = getHome(a) === brId ? -1 : 0
            const bHome = getHome(b) === brId ? -1 : 0
            return aHome - bHome
          })

        let placed = 0
        for (const emp of candidatePool) {
          if (placed >= max) break
          entries.push({
            employeeId: emp.id,
            branchId:   brId,
            date,
            cellType:   'branch',
            startTime:  '09:00',
            endTime:    isSmall ? '16:00' : '21:00',
            note:       'AI Generated',
          })
          usedToday.add(emp.id)
          placed++
        }

        if (placed < min) {
          warnings.push({
            date,
            branchId:    brId,
            branchNameAr: br?.storeNameAr ?? brId,
            need: min,
            got:  placed,
          })
        }
      }
    }
  }

  return { entries, warnings, visitCounts, weekVisits, autoVacationsAdded }
}

// ── Infer current shift from existing entries ─────────────────────────────────
export function inferShift(
  empId: string,
  existingEntries: Array<{ employeeId: string; date: string; cellType: string }>,
  beforeDate: string,
): ShiftType {
  const workEntries = existingEntries
    .filter(e => e.employeeId === empId && e.cellType === 'branch' && e.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!workEntries.length) return 'A'

  const lastDate  = workEntries[0].date
  const d         = dow(lastDate)
  const wasA      = SHIFT_A.has(d)
  const lastSun   = getSunday(lastDate)
  const startSun  = getSunday(beforeDate)
  const weekDiff  = Math.round(
    (new Date(startSun + 'T00:00:00').getTime() - new Date(lastSun + 'T00:00:00').getTime())
    / (7 * 86400000),
  )
  const lastShift: ShiftType = wasA ? 'A' : 'B'
  return ((lastShift === 'A' ? 0 : 1) + weekDiff) % 2 === 0 ? 'A' : 'B'
}
