// ── WE AI Schedule Generator ─────────────────────────────────────────────────
// Rules: FINAL SYSTEM doc 2026-04-30 (confirmed from Schedule02.htm analysis)
//
// SHIFT SYSTEM (weekly alternation):
//   WEEK1_DAYS = Sun(0) Mon(1) Thu(4) Fri(5) Sat(6)  — 5-day week
//   WEEK2_DAYS = Tue(2) Wed(3)                         — 2-day week
//   Employee shift 'A' → starts on WEEK1 in week-0 of the schedule
//   Employee shift 'B' → starts on WEEK2 in week-0 of the schedule
//   Alternates every week:  A→[W1,W2,W1,W2,…]  B→[W2,W1,W2,W1,…]
//
// SMALL BRANCHES (br-03 دلجا, br-07 بني أحمد, br-08 صفط):
//   Dedicated IBS employees — work every Sat–Thu (SMALL_OPEN), off on Fri.
//   NOT in the rotation pool.
//
// SENIOR MALLAWY (emp-15 Ahmed Hassan):
//   Fixed at ملوي (br-01), Sun–Thu every week — no rotation.

import type { Employee, Branch } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'

// ── Geography: south → north ──────────────────────────────────────────────────
// دلجا → دير مواس → ملوي → أبوقرقاص → بني أحمد → المنيا → صفط الخمار → المنيا الجديدة
export const GEO_ORDER = [
  'br-03', // دلجا            (0 — southernmost)
  'br-02', // دير مواس        (1)
  'br-01', // ملوي             (2)
  'br-04', // أبوقرقاص        (3)
  'br-07', // بني أحمد        (4)
  'br-05', // المنيا           (5)
  'br-08', // صفط الخمار      (6)
  'br-06', // المنيا الجديدة   (7 — northernmost)
]

// Small branches: IBS only, open Sat–Thu (closed Fri)
export const SMALL_BRANCHES = new Set(['br-03', 'br-07', 'br-08'])

// Dedicated employees for small branches — always at home branch, NOT in rotation pool
const DEDICATED_MAP: Record<string, string> = {
  'emp-26': 'br-03', // أحمد صلاح → دلجا
  'emp-41': 'br-07', // محمد ناصر → بني أحمد
  'emp-22': 'br-08', // محمد جابر → صفط الخمار
}
const DEDICATED_IDS = new Set(Object.keys(DEDICATED_MAP))

// Branch requirements: [min, max, ibsOnly]
// Note: small-branch min/max count the dedicated employee
// br-05 absorbs all remaining available agents
const BRANCH_NEEDS: Record<string, [number, number, boolean]> = {
  'br-03': [1, 1,  true ],  // دلجا            — dedicated emp-26
  'br-02': [1, 1,  false],  // دير مواس
  'br-01': [1, 1,  false],  // ملوي             (senior pre-placed; pool fills 1 more)
  'br-04': [2, 2,  false],  // أبوقرقاص
  'br-07': [1, 1,  true ],  // بني أحمد        — dedicated emp-41
  'br-05': [2, 99, false],  // المنيا           — absorbs surplus
  'br-08': [1, 1,  true ],  // صفط الخمار      — dedicated emp-22
  'br-06': [1, 1,  false],  // المنيا الجديدة
}

// ── Fixed senior assignments ──────────────────────────────────────────────────
export const SENIOR_MALLAWY    = 'emp-15'               // Ahmed Hassan — fixed ملوي Sun–Thu
export const SENIORS_MINYA_A   = ['emp-13', 'emp-16']   // pair A → br-05 even period
export const SENIORS_MINYA_B   = ['emp-14', 'emp-17']   // pair B → br-06 even period
export const ALL_SENIORS_MINYA = [...SENIORS_MINYA_A, ...SENIORS_MINYA_B]

// ── Shift day sets (JS: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat) ──────────
const WEEK1_DAYS          = new Set([0, 1, 4, 5, 6]) // Sun, Mon, Thu, Fri, Sat (5-day)
const WEEK2_DAYS          = new Set([2, 3])           // Tue, Wed (2-day)
const SENIOR_MALLAWY_DAYS = new Set([0, 1, 2, 3, 4]) // Sun–Thu fixed
const SMALL_OPEN          = new Set([0, 1, 2, 3, 4, 6]) // Sat–Thu (no Fri)

// ── Default home branches per employee ───────────────────────────────────────
export const DEFAULT_HOME_BRANCHES: Record<string, string> = {
  // دلجا (br-03)
  'emp-26': 'br-03',

  // دير مواس (br-02)
  'emp-21': 'br-02',
  'emp-38': 'br-02',
  'emp-31': 'br-02',

  // ملوي (br-01)
  'emp-24': 'br-01',
  'emp-28': 'br-01',
  'emp-23': 'br-01',

  // أبوقرقاص (br-04)
  'emp-34': 'br-04',
  'emp-30': 'br-04',
  'emp-37': 'br-04',
  'emp-12': 'br-04',

  // بني أحمد (br-07)
  'emp-41': 'br-07',

  // صفط الخمار (br-08)
  'emp-22': 'br-08',

  // المنيا (br-05)
  'emp-27': 'br-05',
  'emp-19': 'br-05',
  'emp-20': 'br-05',
  'emp-29': 'br-05',
  'emp-32': 'br-05',
  'emp-33': 'br-05',
  'emp-18': 'br-05',

  // المنيا الجديدة (br-06)
  'emp-36': 'br-06',
  'emp-25': 'br-06',
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
  weekStart: string // ISO Sunday
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
  return i < 0 ? 4 : i
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
  const allSundays    = Array.from({ length: weeks }, (_, i) => addDays(startDate, i * 7))
  const periodStart   = startDate
  const periodEnd     = addDays(startDate, weeks * 7 - 1)

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
    const minLoad    = weekLoad[available[0]] ?? 0
    const candidates = available.filter(s => (weekLoad[s] ?? 0) === minLoad)
    const chosen     = candidates[Math.floor(Math.random() * candidates.length)]
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

  // Eligible = all south employees who are not supervisors
  const eligible  = employees.filter(e =>
    e.role !== 'Supervisor' && (e.region ?? 'south') === 'south',
  )
  const agents    = eligible.filter(e => e.role === 'Agent')
  const ibsAgents = agents.filter(e => classifyEmp(e) === 'IBS')

  // Home branch lookup
  function getHome(emp: Employee): string {
    return cfgMap.get(emp.id)?.homeBranchId
      ?? DEFAULT_HOME_BRANCHES[emp.id]
      ?? emp.branchId
      ?? 'br-05'
  }

  // ── Auto-vacation ───────────────────────────────────────────────────────────
  let allVacations           = [...config.vacations]
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
    // Vacation weeks run Mon–Fri (5 working days inside the Sun-starting week)
    for (let i = 1; i <= 5; i++) {
      const d = addDays(v.weekStart, i)
      vacDays.add(`${v.employeeId}:${d}`)
      entries.push({
        employeeId: v.employeeId,
        date:       d,
        cellType:   'annual',
        note:       autoVacationsAdded.some(a => a.id === v.id)
          ? 'AI — إجازة سنوية (تلقائي)'
          : 'AI — إجازة سنوية',
      })
    }
  }

  // ── Shift helper: 'A' starts on WEEK1, 'B' starts on WEEK2 ────────────────
  function empShift(empId: string, weekOffset: number): ShiftType {
    const base = cfgMap.get(empId)?.shift ?? 'A'
    return ((base === 'A' ? 0 : 1) + weekOffset) % 2 === 0 ? 'A' : 'B'
  }

  // Is this a working day for this employee in this week-offset?
  function isWorkDay(empId: string, date: string, weekOffset: number): boolean {
    const d = dow(date)
    if (empId === SENIOR_MALLAWY)  return SENIOR_MALLAWY_DAYS.has(d)
    if (DEDICATED_IDS.has(empId))  return SMALL_OPEN.has(d)
    const s = empShift(empId, weekOffset)
    return s === 'A' ? WEEK1_DAYS.has(d) : WEEK2_DAYS.has(d)
  }

  function isAvailable(empId: string, date: string): boolean {
    return !vacDays.has(`${empId}:${date}`)
  }

  // ── Visit pools (rotation employees not at small branches) ─────────────────
  const visitPool = agents.filter(e =>
    !SMALL_BRANCHES.has(getHome(e)) && !DEDICATED_IDS.has(e.id),
  )
  const weVisit   = visitPool.filter(e => classifyEmp(e) === 'WE')
  const ibsVisit  = visitPool.filter(e => classifyEmp(e) === 'IBS')

  // Round-robin visit selector: WE:IBS ≈ 2:1
  const usedAsVisit = new Set<string>()
  function pickVisit(): Employee | null {
    const weTotal  = weVisit.reduce((s, e)  => s + (visitCounts[e.id]  ?? 0), 0)
    const ibsTotal = ibsVisit.reduce((s, e) => s + (visitCounts[e.id] ?? 0), 0)
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

    // Minya senior pairing rotates every calendar month
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
      const d = dow(date)
      // usedToday tracks all employees given an assignment entry today
      const usedToday       = new Set<string>()
      // todayBranchCount tracks how many employees are placed at each branch today
      const todayBranchCount = new Map<string, number>()

      function placeAt(empId: string, brId: string, entry: ScheduleInput) {
        entries.push(entry)
        usedToday.add(empId)
        if (brId) todayBranchCount.set(brId, (todayBranchCount.get(brId) ?? 0) + 1)
      }

      // ── 1. Visit employee ─────────────────────────────────────────────────
      if (visitEmp && isWorkDay(visitEmp.id, date, w) && isAvailable(visitEmp.id, date)) {
        entries.push({ employeeId: visitEmp.id, date, cellType: 'visit', note: 'AI — زيارة خارجية' })
        usedToday.add(visitEmp.id)
      }

      // ── 2. Senior Mallawy — fixed ملوي, Sun–Thu ───────────────────────────
      if (SENIOR_MALLAWY_DAYS.has(d) && isAvailable(SENIOR_MALLAWY, date)) {
        placeAt(SENIOR_MALLAWY, 'br-01', {
          employeeId: SENIOR_MALLAWY, branchId: 'br-01', date, cellType: 'branch',
          startTime: '09:00', endTime: '21:00', note: 'AI — سينيور ملوي',
        })
      }

      // ── 3. Minya rotating seniors ─────────────────────────────────────────
      for (const sid of pairBr05) {
        if (isWorkDay(sid, date, w) && isAvailable(sid, date)) {
          placeAt(sid, 'br-05', {
            employeeId: sid, branchId: 'br-05', date, cellType: 'branch',
            startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا',
          })
        }
      }
      for (const sid of pairBr06) {
        if (isWorkDay(sid, date, w) && isAvailable(sid, date)) {
          placeAt(sid, 'br-06', {
            employeeId: sid, branchId: 'br-06', date, cellType: 'branch',
            startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا الجديدة',
          })
        }
      }

      // ── 4. Dedicated small-branch employees ───────────────────────────────
      // emp-26→br-03, emp-41→br-07, emp-22→br-08 work every Sat–Thu
      for (const [empId, brId] of Object.entries(DEDICATED_MAP)) {
        if (SMALL_OPEN.has(d) && isAvailable(empId, date)) {
          const br = brMap.get(brId)
          placeAt(empId, brId, {
            employeeId: empId, branchId: brId, date, cellType: 'branch',
            startTime: '09:00', endTime: '16:00',
            note: `AI — ${br?.storeNameAr ?? brId}`,
          })
        }
      }

      // ── 5. Branch assignments in geographic order south → north ───────────
      for (const brId of GEO_ORDER) {
        const [min, max, ibsOnly] = BRANCH_NEEDS[brId] ?? [1, 1, false]
        const isSmall = SMALL_BRANCHES.has(brId)

        // Small branches closed on Friday
        if (isSmall && !SMALL_OPEN.has(d)) continue

        // Count pre-placed employees (seniors, dedicated) already at this branch
        let placed = todayBranchCount.get(brId) ?? 0

        if (placed >= max) continue // already full

        // Build candidate pool — exclude dedicated employees from all branches
        // (they're already pre-placed at their own branch or on vacation)
        const candidatePool = (ibsOnly ? ibsAgents : agents)
          .filter(e =>
            !usedToday.has(e.id) &&
            !DEDICATED_IDS.has(e.id) &&
            isAvailable(e.id, date) &&
            isWorkDay(e.id, date, w),
          )
          .sort((a, b) => {
            const da = geoDist(getHome(a), brId)
            const db = geoDist(getHome(b), brId)
            if (da !== db) return da - db
            // Tie-break: prefer home-branch employees
            return (getHome(a) === brId ? -1 : 0) - (getHome(b) === brId ? -1 : 0)
          })

        for (const emp of candidatePool) {
          if (placed >= max) break
          placeAt(emp.id, brId, {
            employeeId: emp.id, branchId: brId, date, cellType: 'branch',
            startTime: '09:00', endTime: isSmall ? '16:00' : '21:00',
            note: 'AI Generated',
          })
          placed++
        }

        if (placed < min) {
          const br = brMap.get(brId)
          warnings.push({
            date,
            branchId:    brId,
            branchNameAr: br?.storeNameAr ?? brId,
            need: min,
            got:  placed,
          })
        }
      }

      // ── 6. Generate 'off' entries for non-working employees ───────────────
      // Covers all south agents + handled seniors for their rest days
      const allTracked = [
        ...agents,
        ...ALL_SENIORS_MINYA.map(id => employees.find(e => e.id === id)).filter(Boolean) as Employee[],
        employees.find(e => e.id === SENIOR_MALLAWY),
      ].filter(Boolean) as Employee[]

      for (const emp of allTracked) {
        if (usedToday.has(emp.id)) continue       // already assigned
        if (vacDays.has(`${emp.id}:${date}`)) continue  // on vacation
        if (!isWorkDay(emp.id, date, w)) {
          entries.push({
            employeeId: emp.id,
            date,
            cellType:   'off',
            note:       'راحة',
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
  // If last worked on a WEEK1 day (Sun/Mon/Thu/Fri/Sat) → was on WEEK1 → shift A that week
  const wasWeek1  = WEEK1_DAYS.has(d)
  const lastSun   = getSunday(lastDate)
  const startSun  = getSunday(beforeDate)
  const weekDiff  = Math.round(
    (new Date(startSun + 'T00:00:00').getTime() - new Date(lastSun + 'T00:00:00').getTime())
    / (7 * 86400000),
  )
  const lastShift: ShiftType = wasWeek1 ? 'A' : 'B'
  return ((lastShift === 'A' ? 0 : 1) + weekDiff) % 2 === 0 ? 'A' : 'B'
}
