// ── WE AI Schedule Generator ─────────────────────────────────────────────────
// Algorithm confirmed from Schedule02.htm reference analysis (2026-04-30).
//
// CORE PRINCIPLE: every employee goes to their HOME BRANCH on their working
// days. Movement only occurs when an employee is on visit duty, or when the
// gap-fixer needs to cover a branch left short by vacation.
//
// SHIFT CALIBRATION:
//   Reference week: 2026-04-05 (Sunday).
//   REFERENCE_WEEK2_GROUP employees did WEEK2 (Tue+Wed) that week → base shift 'B'.
//   All others did WEEK1 (Sun+Mon+Thu+Fri+Sat) → base shift 'A'.
//   For any schedule start date the correct shift is derived automatically.
//
// SENIORS are OUTSIDE the branch-quota system — exactly like visit employees.
//   They are pre-placed before the regular-agent loop and do NOT increment
//   todayBranchCount. Each branch's BRANCH_NEEDS represents regular-agent slots.

import type { Employee, Branch } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'

// ── Geography: south → north ──────────────────────────────────────────────────
export const GEO_ORDER = [
  'br-03', // دلجا            (0)
  'br-02', // دير مواس        (1)
  'br-01', // ملوي             (2)
  'br-04', // أبوقرقاص        (3)
  'br-07', // بني أحمد        (4)
  'br-05', // المنيا           (5)
  'br-08', // صفط الخمار      (6)
  'br-06', // المنيا الجديدة   (7)
]

// Small branches: IBS only, open Sat–Thu (no Friday)
export const SMALL_BRANCHES = new Set(['br-03', 'br-07', 'br-08'])

// Dedicated IBS employees — always at their home branch, work every Sat–Thu
const DEDICATED_MAP: Record<string, string> = {
  'emp-26': 'br-03',
  'emp-41': 'br-07',
  'emp-22': 'br-08',
}
const DEDICATED_IDS = new Set(Object.keys(DEDICATED_MAP))

// Branch regular-agent quotas [min, max, ibsOnly]
// Seniors and visit employees are NOT included in these counts.
const BRANCH_NEEDS: Record<string, [number, number, boolean]> = {
  'br-03': [1, 1,  true ],  // دلجا         — dedicated emp-26
  'br-02': [1, 1,  false],  // دير مواس
  'br-01': [1, 1,  false],  // ملوي          (senior Mallawy is additional, not counted)
  'br-04': [2, 2,  false],  // أبوقرقاص
  'br-07': [1, 1,  true ],  // بني أحمد     — dedicated emp-41
  'br-05': [2, 99, false],  // المنيا        — absorbs all surplus
  'br-08': [1, 1,  true ],  // صفط الخمار   — dedicated emp-22
  'br-06': [1, 1,  false],  // المنيا الجديدة
}

// ── Fixed senior assignments ──────────────────────────────────────────────────
export const SENIOR_MALLAWY    = 'emp-15'
export const SENIORS_MINYA_A   = ['emp-13', 'emp-16']  // → br-05 even periods
export const SENIORS_MINYA_B   = ['emp-14', 'emp-17']  // → br-06 even periods
export const ALL_SENIORS_MINYA = [...SENIORS_MINYA_A, ...SENIORS_MINYA_B]

// ── Shift day sets ────────────────────────────────────────────────────────────
// JS: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
const WEEK1_DAYS          = new Set([0, 1, 4, 5, 6]) // Sun Mon Thu Fri Sat
const WEEK2_DAYS          = new Set([2, 3])           // Tue Wed
const SENIOR_MALLAWY_DAYS = new Set([0, 1, 2, 3, 4]) // Sun–Thu
const SMALL_OPEN          = new Set([0, 1, 2, 3, 4, 6]) // Sat–Thu (no Fri)

// ── Reference date for automatic shift calibration ───────────────────────────
// In the week of 2026-04-05 these employees worked WEEK2 (Tue+Wed) → base shift 'B'.
// All other agents worked WEEK1 that week → base shift 'A'.
export const REFERENCE_DATE = '2026-04-05'

export const REFERENCE_WEEK2_GROUP = new Set([
  // Confirmed Group A from Schedule02.htm (work Tue+Wed in reference week):
  'emp-36', 'emp-30', 'emp-24', 'emp-38', 'emp-27',
  'emp-19', 'emp-20', 'emp-31', 'emp-37', 'emp-33',
  // Seniors following Group A pattern (confirmed from reference HTML):
  'emp-17', // Ahmed Alaa 6882
  'emp-16', // Ali Mahrous 5839
])

// ── Default home branches ─────────────────────────────────────────────────────
export const DEFAULT_HOME_BRANCHES: Record<string, string> = {
  'emp-26': 'br-03',
  'emp-21': 'br-02', 'emp-38': 'br-02', 'emp-31': 'br-02',
  'emp-24': 'br-01', 'emp-28': 'br-01', 'emp-23': 'br-01',
  'emp-34': 'br-04', 'emp-30': 'br-04', 'emp-37': 'br-04', 'emp-12': 'br-04',
  'emp-41': 'br-07',
  'emp-22': 'br-08',
  'emp-27': 'br-05', 'emp-19': 'br-05', 'emp-20': 'br-05', 'emp-29': 'br-05',
  'emp-32': 'br-05', 'emp-33': 'br-05', 'emp-18': 'br-05', 'emp-39': 'br-05',
  'emp-36': 'br-06', 'emp-25': 'br-06',
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type EmployeeType = 'WE' | 'IBS'
export type ShiftType    = 'A' | 'B'

export interface EmployeeAIConfig {
  employeeId:   string
  homeBranchId: string
  shift:        ShiftType
}

export interface VacationWeek {
  id:         string
  employeeId: string
  weekStart:  string // ISO Sunday
}

export interface AIConfig {
  startDate:    string
  weeks:        number
  empConfigs:   EmployeeAIConfig[]
  vacations:    VacationWeek[]
  visitCounts:  Record<string, number>
  autoVacation: boolean
}

export interface AIWarning {
  date:        string
  branchId:    string
  branchNameAr:string
  need:        number
  got:         number
}

export interface WeekVisitInfo {
  weekStart:  string
  employee:   Employee
  empType:    EmployeeType
}

export interface AIResult {
  entries:             ScheduleInput[]
  warnings:            AIWarning[]
  visitCounts:         Record<string, number>
  weekVisits:          WeekVisitInfo[]
  autoVacationsAdded:  VacationWeek[]
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
  const added: VacationWeek[]  = []
  const allSundays             = Array.from({ length: weeks }, (_, i) => addDays(startDate, i * 7))
  const periodStart            = startDate
  const periodEnd              = addDays(startDate, weeks * 7 - 1)

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
    if (allSundays.includes(v.weekStart))
      weekLoad[v.weekStart] = (weekLoad[v.weekStart] ?? 0) + 1
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

  // eligible = all south non-supervisors
  const eligible = employees.filter(e =>
    e.role !== 'Supervisor' && (e.region ?? 'south') === 'south',
  )
  // agents = regular employees (role Agent). Seniors (role Senior) are separate.
  const agents  = eligible.filter(e => e.role === 'Agent')
  const seniors = eligible.filter(e => e.role === 'Senior')

  function getHome(emp: Employee): string {
    return cfgMap.get(emp.id)?.homeBranchId
      ?? DEFAULT_HOME_BRANCHES[emp.id]
      ?? emp.branchId
      ?? 'br-05'
  }

  // ── Shift calibration from reference date ───────────────────────────────────
  const schedStartSun = getSunday(config.startDate)
  const weeksFromRef  = Math.round(
    (new Date(schedStartSun + 'T00:00:00').getTime() -
     new Date(REFERENCE_DATE + 'T00:00:00').getTime()) / (7 * 86400000),
  )

  function baseShift(empId: string): ShiftType {
    // User-configured shift takes priority (it IS the shift for week-0 of THIS schedule)
    const configured = cfgMap.get(empId)?.shift
    if (configured) return configured
    // Derive from reference
    const refBase: ShiftType = REFERENCE_WEEK2_GROUP.has(empId) ? 'B' : 'A'
    return ((refBase === 'A' ? 0 : 1) + weeksFromRef) % 2 === 0 ? 'A' : 'B'
  }

  function empShift(empId: string, weekOffset: number): ShiftType {
    const base = baseShift(empId)
    return ((base === 'A' ? 0 : 1) + weekOffset) % 2 === 0 ? 'A' : 'B'
  }

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

  // ── Auto-vacation ───────────────────────────────────────────────────────────
  let allVacations: VacationWeek[] = [...config.vacations]
  let autoVacationsAdded: VacationWeek[] = []
  if (config.autoVacation) {
    autoVacationsAdded = autoAssignVacations(
      agents, config.vacations, config.startDate, config.weeks,
    )
    allVacations = [...allVacations, ...autoVacationsAdded]
  }

  // Vacation day lookup — covers the employee's actual working days that week
  const vacDays = new Set<string>()
  for (const v of allVacations) {
    for (let i = 0; i < 7; i++) {
      const d        = addDays(v.weekStart, i)
      const wOffset  = Math.round(
        (new Date(getSunday(d) + 'T00:00:00').getTime() -
         new Date(schedStartSun + 'T00:00:00').getTime()) / (7 * 86400000),
      )
      if (isWorkDay(v.employeeId, d, wOffset)) {
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
  }

  // ── Visit pool: regular agents not dedicated to small branches ──────────────
  const visitPool = agents.filter(e => !SMALL_BRANCHES.has(getHome(e)))
  const weVisit   = visitPool.filter(e => classifyEmp(e) === 'WE')
  const ibsVisit  = visitPool.filter(e => classifyEmp(e) === 'IBS')

  const usedAsVisit = new Set<string>()
  function pickVisit(): Employee | null {
    const weTotal  = weVisit.reduce((s, e)  => s + (visitCounts[e.id]  ?? 0), 0)
    const ibsTotal = ibsVisit.reduce((s, e) => s + (visitCounts[e.id] ?? 0), 0)
    const pickWE   = ibsTotal === 0 || weTotal / Math.max(ibsTotal, 1) < 2
    const pool     = (pickWE ? weVisit : ibsVisit).filter(e => !usedAsVisit.has(e.id))
    if (!pool.length) return null
    // Among candidates with equal min visit count, pick randomly for variety
    const minCount = Math.min(...pool.map(e => visitCounts[e.id] ?? 0))
    const tied     = pool.filter(e => (visitCounts[e.id] ?? 0) === minCount)
    return tied[Math.floor(Math.random() * tied.length)]
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

    const visitEmp = pickVisit()
    if (visitEmp) {
      usedAsVisit.add(visitEmp.id)
      visitCounts[visitEmp.id] = (visitCounts[visitEmp.id] ?? 0) + 1
      weekVisits.push({ weekStart: sun, employee: visitEmp, empType: classifyEmp(visitEmp) })
    }

    // ── Daily loop ────────────────────────────────────────────────────────────
    for (const date of dates) {
      const d = dow(date)
      // usedToday = seniors + visit (pre-placed, do NOT count toward quota)
      const usedToday       = new Set<string>()
      // todayBranchCount = ONLY regular-agent placements (quota tracking)
      const todayBranchCount = new Map<string, number>()

      // Pre-place without touching todayBranchCount
      function prePlace(empId: string, entry: ScheduleInput) {
        entries.push(entry)
        usedToday.add(empId)
      }

      // ── 1. Visit employee ─────────────────────────────────────────────────
      if (visitEmp && isWorkDay(visitEmp.id, date, w) && isAvailable(visitEmp.id, date)) {
        prePlace(visitEmp.id, {
          employeeId: visitEmp.id, date, cellType: 'visit', note: 'AI — زيارة خارجية',
        })
      }

      // ── 2. Senior Mallawy — br-01, Sun–Thu ───────────────────────────────
      if (SENIOR_MALLAWY_DAYS.has(d) && isAvailable(SENIOR_MALLAWY, date)) {
        prePlace(SENIOR_MALLAWY, {
          employeeId: SENIOR_MALLAWY, branchId: 'br-01', date, cellType: 'branch',
          startTime: '09:00', endTime: '21:00', note: 'AI — سينيور ملوي',
        })
      }

      // ── 3. Minya rotating seniors ─────────────────────────────────────────
      for (const sid of pairBr05) {
        if (isWorkDay(sid, date, w) && isAvailable(sid, date))
          prePlace(sid, { employeeId: sid, branchId: 'br-05', date, cellType: 'branch', startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا' })
      }
      for (const sid of pairBr06) {
        if (isWorkDay(sid, date, w) && isAvailable(sid, date))
          prePlace(sid, { employeeId: sid, branchId: 'br-06', date, cellType: 'branch', startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا الجديدة' })
      }

      // ── 4. Regular agents: home-branch assignment ─────────────────────────
      // dayAssignment: empId → branchId (working) | null (off)
      const dayAssignment = new Map<string, string | null>()

      for (const agent of agents) {
        if (usedToday.has(agent.id)) continue         // on visit duty
        if (vacDays.has(`${agent.id}:${date}`)) continue // on vacation

        const homeId = getHome(agent)

        // Small branches are closed Friday
        if (SMALL_BRANCHES.has(homeId) && !SMALL_OPEN.has(d)) {
          dayAssignment.set(agent.id, null)
          continue
        }

        if (isWorkDay(agent.id, date, w)) {
          dayAssignment.set(agent.id, homeId)
          todayBranchCount.set(homeId, (todayBranchCount.get(homeId) ?? 0) + 1)
        } else {
          dayAssignment.set(agent.id, null) // off day
        }
      }

      // ── 5. Gap fixer — cover branches short of their minimum ──────────────
      // Only runs when vacation / visit empties a branch. Uses surplus agents
      // from over-staffed branches (random tiebreaking for schedule variety).
      for (const brId of GEO_ORDER) {
        const [min,, ibsOnly] = BRANCH_NEEDS[brId] ?? [1, 1, false]
        const isSmall = SMALL_BRANCHES.has(brId)
        if (isSmall && !SMALL_OPEN.has(d)) continue

        const currentCount = () => todayBranchCount.get(brId) ?? 0
        if (currentCount() >= min) continue

        const needed = min - currentCount()
        for (let n = 0; n < needed; n++) {
          // Find agents at over-staffed branches, nearest to this branch
          const movable = agents
            .filter(e => {
              const assignedBr = dayAssignment.get(e.id)
              if (!assignedBr || assignedBr === brId) return false
              if (ibsOnly && classifyEmp(e) === 'WE') return false
              const [brMin] = BRANCH_NEEDS[assignedBr] ?? [1, 1, false]
              return (todayBranchCount.get(assignedBr) ?? 0) > brMin
            })

          if (!movable.length) break // No surplus anywhere — accept the gap

          // Sort by geographic distance; randomise ties for proposal variety
          movable.sort((a, b) => {
            const da = geoDist(getHome(a), brId)
            const db = geoDist(getHome(b), brId)
            return da !== db ? da - db : Math.random() - 0.5
          })

          const emp    = movable[0]
          const oldBr  = dayAssignment.get(emp.id)!
          dayAssignment.set(emp.id, brId)
          todayBranchCount.set(oldBr, Math.max(0, (todayBranchCount.get(oldBr) ?? 1) - 1))
          todayBranchCount.set(brId,  (todayBranchCount.get(brId) ?? 0) + 1)
        }

        if (currentCount() < min) {
          const br = brMap.get(brId)
          warnings.push({
            date, branchId: brId,
            branchNameAr: br?.storeNameAr ?? brId,
            need: min, got: currentCount(),
          })
        }
      }

      // ── 6. Flush dayAssignment → entries ──────────────────────────────────
      for (const [empId, brId] of dayAssignment.entries()) {
        if (brId === null) {
          entries.push({ employeeId: empId, date, cellType: 'off', note: 'راحة' })
        } else {
          const isSmall = SMALL_BRANCHES.has(brId)
          entries.push({
            employeeId: empId, branchId: brId, date, cellType: 'branch',
            startTime: '09:00', endTime: isSmall ? '16:00' : '21:00',
            note: 'AI Generated',
          })
        }
      }

      // ── 7. Off entries for seniors on their rest days ─────────────────────
      const allSeniors = [
        ...seniors,
        employees.find(e => e.id === SENIOR_MALLAWY),
      ].filter(Boolean) as Employee[]

      for (const sen of allSeniors) {
        if (usedToday.has(sen.id)) continue
        if (vacDays.has(`${sen.id}:${date}`)) continue
        if (!isWorkDay(sen.id, date, w)) {
          entries.push({ employeeId: sen.id, date, cellType: 'off', note: 'راحة' })
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
  const lastD     = dow(lastDate)
  const wasWeek1  = WEEK1_DAYS.has(lastD)
  const lastSun   = getSunday(lastDate)
  const startSun  = getSunday(beforeDate)
  const weekDiff  = Math.round(
    (new Date(startSun + 'T00:00:00').getTime() - new Date(lastSun + 'T00:00:00').getTime())
    / (7 * 86400000),
  )
  const lastShift: ShiftType = wasWeek1 ? 'A' : 'B'
  return ((lastShift === 'A' ? 0 : 1) + weekDiff) % 2 === 0 ? 'A' : 'B'
}
