// ── WE AI Schedule Generator — DAILY 5+2 SYSTEM ─────────────────────────────
//
// CORE SYSTEM (daily rolling schedule):
//   • Each employee has a 7-day cycle: 5 work days + 2 OFF days
//   • cycleOffset (0–6) = where the employee sits in the cycle on day-0 of schedule
//     isOff(dayIdx, offset) = (dayIdx + offset) % 7 >= 5
//   • Different employees have different offsets → staggered coverage every day
//
// DAILY BRANCH COVERAGE (fixed minimums, regular agents only, seniors excluded):
//   br-02 (Deir Mawas)   = 1
//   br-01 (Mallawi)      = 2   ← senior Mallawy is EXTRA, not counted
//   br-04 (Abu Qurqas)   = 2
//   br-06 (Minya New)    = 1   ← Minya seniors are EXTRA, not counted
//   br-05 (Minya)        = 2+  ← absorbs all surplus
//   br-03 (Dalga)        = 1   09:00–16:00, IBS only
//   br-07 (Beni Ahmed)   = 1   09:00–16:00, IBS only
//   br-08 (Saft)         = 1   09:00–16:00, IBS only
//
// VISIT (daily):
//   1 agent from Minya (br-05 home) per day, rotating by lowest count
//   NOT counted in branch coverage
//
// PRIORITY ORDER each day:
//   1. Pre-place seniors (outside quota)
//   2. Pick daily visit employee
//   3. Assign all available agents to home branch (tentative)
//   4. Gap fixer: ensure every branch ≥ min (borrow from surplus, random tiebreak)
//   5. Emit entries; everyone without entry → 'off'

import type { Employee, Branch } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'

// ── Geography: south → north ──────────────────────────────────────────────────
export const GEO_ORDER = [
  'br-03', // دلجا         (0)
  'br-02', // دير مواس     (1)
  'br-01', // ملوي          (2)
  'br-04', // أبوقرقاص     (3)
  'br-07', // بني أحمد     (4)
  'br-05', // المنيا        (5)
  'br-08', // صفط الخمار   (6)
  'br-06', // المنيا الجديدة (7)
]

export const SMALL_BRANCHES = new Set(['br-03', 'br-07', 'br-08'])

// Dedicated IBS employees for small branches
const DEDICATED_MAP: Record<string, string> = {
  'emp-26': 'br-03',
  'emp-41': 'br-07',
  'emp-22': 'br-08',
}
const DEDICATED_IDS = new Set(Object.keys(DEDICATED_MAP))

// Regular-agent quotas per day [min, max, ibsOnly]  — seniors NOT included
const BRANCH_NEEDS: Record<string, [number, number, boolean]> = {
  'br-03': [1, 1,  true ],
  'br-02': [1, 1,  false],
  'br-01': [2, 2,  false],
  'br-04': [2, 2,  false],
  'br-07': [1, 1,  true ],
  'br-05': [2, 99, false],
  'br-08': [1, 1,  true ],
  'br-06': [1, 1,  false],
}

// ── Fixed senior assignments ──────────────────────────────────────────────────
export const SENIOR_MALLAWY    = 'emp-15'                       // Sun–Thu, br-01
export const SENIORS_MINYA_A   = ['emp-13', 'emp-16']           // → br-05 even months
export const SENIORS_MINYA_B   = ['emp-14', 'emp-17']           // → br-06 even months
export const ALL_SENIORS_MINYA = [...SENIORS_MINYA_A, ...SENIORS_MINYA_B]

// Senior Mallawy works Sun–Thu (0=Sun…4=Thu)
const SENIOR_MALLAWY_DAYS = new Set([0, 1, 2, 3, 4])

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

export interface EmployeeAIConfig {
  employeeId:   string
  homeBranchId: string
  cycleOffset:  number  // 0–6: position in 7-day work/off cycle on schedule day-0
                        // isOff(dayIdx) = (dayIdx + cycleOffset) % 7 >= 5
}

export interface VacationWeek {
  id:         string
  employeeId: string
  weekStart:  string  // ISO Sunday
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
  date:         string
  branchId:     string
  branchNameAr: string
  need:         number
  got:          number
}

export interface WeekVisitInfo {
  weekStart: string   // first visit date for this employee
  employee:  Employee
  empType:   EmployeeType
}

export interface AIResult {
  entries:            ScheduleInput[]
  warnings:           AIWarning[]
  visitCounts:        Record<string, number>
  weekVisits:         WeekVisitInfo[]   // one entry per employee (aggregated)
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

function dow(iso: string): number {
  return new Date(iso + 'T00:00:00').getDay()
}

export function getSunday(iso: string): string {
  const d   = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

// Auto-assign staggered cycle offsets so no single day has too many employees off
export function autoStaggerOffsets(agents: Employee[], getHome: (e: Employee) => string): Map<string, number> {
  const result   = new Map<string, number>()
  // Sort by geo order of home branch for consistent assignment
  const sorted   = [...agents].sort((a, b) => {
    const diff = geoIdx(getHome(a)) - geoIdx(getHome(b))
    return diff !== 0 ? diff : a.id.localeCompare(b.id)
  })
  sorted.forEach((agent, idx) => result.set(agent.id, idx % 7))
  return result
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

  const eligible = employees.filter(e =>
    e.role !== 'Supervisor' && (e.region ?? 'south') === 'south',
  )
  const agents   = eligible.filter(e => e.role === 'Agent')
  const seniors  = eligible.filter(e => e.role === 'Senior')

  function getHome(emp: Employee): string {
    return cfgMap.get(emp.id)?.homeBranchId
      ?? DEFAULT_HOME_BRANCHES[emp.id]
      ?? emp.branchId
      ?? 'br-05'
  }

  // Cycle offset for each agent
  const autoOffsets  = autoStaggerOffsets(agents, getHome)
  function cycleOffset(empId: string): number {
    return cfgMap.get(empId)?.cycleOffset ?? autoOffsets.get(empId) ?? 0
  }

  // isOff: true when dayIdx is one of this employee's 2 off days in the 7-day cycle
  function isOffDay(empId: string, dayIdx: number): boolean {
    return (dayIdx + cycleOffset(empId)) % 7 >= 5
  }

  // ── Vacation setup ──────────────────────────────────────────────────────────
  let allVacations: VacationWeek[] = [...config.vacations]
  let autoVacationsAdded: VacationWeek[] = []
  if (config.autoVacation) {
    autoVacationsAdded = autoAssignVacations(agents, config.vacations, config.startDate, config.weeks)
    allVacations       = [...allVacations, ...autoVacationsAdded]
  }

  // vacDays: only covers employee's actual WORKING days in the vacation week
  const vacDays = new Set<string>()
  for (const v of allVacations) {
    for (let i = 0; i < 7; i++) {
      const d       = addDays(v.weekStart, i)
      const dayIdx  = Math.round(
        (new Date(d + 'T00:00:00').getTime() -
         new Date(config.startDate + 'T00:00:00').getTime()) / 86400000,
      )
      if (!isOffDay(v.employeeId, dayIdx)) {    // only mark working days as vacation
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

  // Visit pool: Minya agents (home br-05), not dedicated to small branches
  const visitPool     = agents.filter(e => getHome(e) === 'br-05' && !DEDICATED_IDS.has(e.id))
  const visitFirstDay = new Map<string, string>() // empId → first date they did visit

  // ── Daily loop ──────────────────────────────────────────────────────────────
  const totalDays = config.weeks * 7

  // Senior Minya pairing per calendar month
  const startMonth = new Date(config.startDate + 'T00:00:00').getMonth()

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const date = addDays(config.startDate, dayIdx)
    const d    = dow(date)

    // Minya senior branch pairing for this month
    const curMonth = new Date(date + 'T00:00:00').getMonth()
    const swapped  = ((curMonth - startMonth + 12) % 12) % 2 === 1
    const pairBr05 = swapped ? SENIORS_MINYA_B : SENIORS_MINYA_A
    const pairBr06 = swapped ? SENIORS_MINYA_A : SENIORS_MINYA_B

    // Employees already assigned an entry today
    const usedToday       = new Set<string>()
    // Quota tracking (regular agents only, seniors NOT counted)
    const todayBranchCount = new Map<string, number>()

    // Pre-place: pushes entry, marks usedToday; does NOT touch todayBranchCount
    function prePlace(empId: string, entry: ScheduleInput) {
      entries.push(entry)
      usedToday.add(empId)
    }

    // ── 1. Senior Mallawy — br-01 Sun–Thu ─────────────────────────────────
    if (SENIOR_MALLAWY_DAYS.has(d) && !vacDays.has(`${SENIOR_MALLAWY}:${date}`)) {
      prePlace(SENIOR_MALLAWY, {
        employeeId: SENIOR_MALLAWY, branchId: 'br-01', date, cellType: 'branch',
        startTime: '09:00', endTime: '21:00', note: 'AI — سينيور ملوي',
      })
    }

    // ── 2. Minya rotating seniors ──────────────────────────────────────────
    const seniorsDayOff = !isOffDay(SENIOR_MALLAWY, dayIdx)  // reuse pattern check
    for (const sid of pairBr05) {
      if (!isOffDay(sid, dayIdx) && !vacDays.has(`${sid}:${date}`)) {
        prePlace(sid, { employeeId: sid, branchId: 'br-05', date, cellType: 'branch', startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا' })
      }
    }
    // suppress unused warning
    void seniorsDayOff
    for (const sid of pairBr06) {
      if (!isOffDay(sid, dayIdx) && !vacDays.has(`${sid}:${date}`)) {
        prePlace(sid, { employeeId: sid, branchId: 'br-06', date, cellType: 'branch', startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا الجديدة' })
      }
    }

    // ── 3. Daily visit — 1 Minya agent, lowest visit count ────────────────
    const visitCandidates = visitPool.filter(e =>
      !isOffDay(e.id, dayIdx) && !vacDays.has(`${e.id}:${date}`) && !usedToday.has(e.id),
    )
    if (visitCandidates.length > 0) {
      const minVisits  = Math.min(...visitCandidates.map(e => visitCounts[e.id] ?? 0))
      const tied       = visitCandidates.filter(e => (visitCounts[e.id] ?? 0) === minVisits)
      const visitEmp   = tied[Math.floor(Math.random() * tied.length)]
      visitCounts[visitEmp.id] = (visitCounts[visitEmp.id] ?? 0) + 1
      if (!visitFirstDay.has(visitEmp.id)) visitFirstDay.set(visitEmp.id, date)
      prePlace(visitEmp.id, {
        employeeId: visitEmp.id, date, cellType: 'visit',
        startTime: '09:00', endTime: '17:00', note: 'AI — زيارة خارجية',
      })
    }

    // ── 4. Regular agents: home-branch tentative assignment ───────────────
    // dayAssignment: empId → branchId (working) | null (off/vacation/preplace)
    const dayAssignment = new Map<string, string | null>()

    for (const agent of agents) {
      if (usedToday.has(agent.id)) continue              // already placed (visit / dedicated)
      if (vacDays.has(`${agent.id}:${date}`)) continue  // on vacation (entry already pushed)

      if (isOffDay(agent.id, dayIdx)) {
        dayAssignment.set(agent.id, null)  // off day
      } else {
        const homeId = getHome(agent)
        dayAssignment.set(agent.id, homeId)
        todayBranchCount.set(homeId, (todayBranchCount.get(homeId) ?? 0) + 1)
      }
    }

    // ── 5. Gap fixer — cover branches short of minimum ─────────────────────
    for (const brId of GEO_ORDER) {
      const [min,, ibsOnly] = BRANCH_NEEDS[brId] ?? [1, 1, false]

      const currentCount = () => todayBranchCount.get(brId) ?? 0
      if (currentCount() >= min) continue

      const needed = min - currentCount()
      for (let n = 0; n < needed; n++) {
        // Find agents at over-staffed branches nearest to this branch
        const movable = agents.filter(e => {
          const assignedBr = dayAssignment.get(e.id)
          if (!assignedBr || assignedBr === brId) return false
          if (ibsOnly && classifyEmp(e) === 'WE') return false
          const [brMin] = BRANCH_NEEDS[assignedBr] ?? [1, 1, false]
          return (todayBranchCount.get(assignedBr) ?? 0) > brMin
        })

        if (!movable.length) break  // no surplus available → gap remains

        movable.sort((a, b) => {
          const da = geoDist(getHome(a), brId)
          const db = geoDist(getHome(b), brId)
          return da !== db ? da - db : Math.random() - 0.5  // random tiebreak = new proposals
        })

        const emp   = movable[0]
        const oldBr = dayAssignment.get(emp.id)!
        dayAssignment.set(emp.id, brId)
        todayBranchCount.set(oldBr, Math.max(0, (todayBranchCount.get(oldBr) ?? 1) - 1))
        todayBranchCount.set(brId, currentCount() + 1)
      }

      if (currentCount() < min) {
        const br = brMap.get(brId)
        warnings.push({ date, branchId: brId, branchNameAr: br?.storeNameAr ?? brId, need: min, got: currentCount() })
      }
    }

    // ── 6. Flush dayAssignment → entries ───────────────────────────────────
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

    // ── 7. Off entries for seniors on their rest days ──────────────────────
    const allSeniorsToday = [
      ...seniors,
      employees.find(e => e.id === SENIOR_MALLAWY),
    ].filter(Boolean) as Employee[]

    for (const sen of allSeniorsToday) {
      if (usedToday.has(sen.id)) continue
      if (vacDays.has(`${sen.id}:${date}`)) continue
      // Senior Mallawy: off on Fri(5) and Sat(6); Minya seniors: use cycle
      const senOff = sen.id === SENIOR_MALLAWY
        ? !SENIOR_MALLAWY_DAYS.has(d)
        : isOffDay(sen.id, dayIdx)
      if (senOff) {
        entries.push({ employeeId: sen.id, date, cellType: 'off', note: 'راحة' })
      }
    }
  }

  // Build weekVisits summary (one entry per employee who did visit)
  for (const [empId, firstDate] of visitFirstDay.entries()) {
    const emp = employees.find(e => e.id === empId)
    if (emp) weekVisits.push({ weekStart: firstDate, employee: emp, empType: classifyEmp(emp) })
  }

  return { entries, warnings, visitCounts, weekVisits, autoVacationsAdded }
}
