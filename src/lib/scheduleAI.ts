// ── WE AI Schedule Generator ─────────────────────────────────────────────────
// Algorithmic schedule generation for South region.
// Rules: FINAL SYSTEM doc 2026-04-30 (updated shift correction 2026-04-30)

import type { Employee, Branch } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'

// ── Geography (index 0 = southernmost) ───────────────────────────────────────
export const GEO_ORDER = [
  'br-03', // دلجا
  'br-02', // دير مواس
  'br-01', // ملوي
  'br-04', // أبوقرقاص
  'br-07', // بني أحمد
  'br-05', // المنيا
  'br-08', // صفط الخمار
  'br-06', // المنيا الجديدة
]

// Small branches: open Sat–Thu (off Fri), 9–16, must have IBS employee
export const SMALL_BRANCHES = new Set(['br-03', 'br-07', 'br-08'])

// Main branch agent quotas [min, max] — seniors NOT counted here
export const BRANCH_QUOTA: Record<string, [number, number]> = {
  'br-01': [1, 1], // ملوي       (+emp-15 senior already placed)
  'br-02': [1, 1], // دير مواس
  'br-04': [2, 2], // أبوقرقاص
  'br-05': [2, 3], // المنيا     (surplus goes here)
  'br-06': [1, 1], // المنيا الجديدة
}

// Main branch fill priority
export const MAIN_BRANCH_ORDER = ['br-02', 'br-01', 'br-04', 'br-06', 'br-05']

// ── Fixed senior assignments ──────────────────────────────────────────────────
export const SENIOR_MALLAWY = 'emp-15' // Ahmed Hassan — fixed ملوي, Sun–Thu 5 days
// Monthly-rotating Minya seniors (pairs swap each month)
// Pair A → br-05, Pair B → br-06 (then swap next month)
export const SENIORS_MINYA_A = ['emp-13', 'emp-16'] // Ahmed Galal, Ali Mahrous
export const SENIORS_MINYA_B = ['emp-14', 'emp-17'] // Mohamed Hisham, Ahmed Alaa
export const ALL_SENIORS_MINYA = [...SENIORS_MINYA_A, ...SENIORS_MINYA_B]

// ── Shift day sets (JS: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat) ───────────
// Shift A: Sat + Tue + Wed  (3 working days)
// Shift B: Sun + Mon + Thu + Fri  (4 working days)
// They swap every week → each employee alternates A then B then A …
const SHIFT_A = new Set([6, 2, 3])       // Sat, Tue, Wed
const SHIFT_B = new Set([0, 1, 4, 5])    // Sun, Mon, Thu, Fri

// Senior Mallawy fixed work days: Sun–Thu (5 days every week, no rotation)
const SENIOR_MALLAWY_DAYS = new Set([0, 1, 2, 3, 4]) // Sun Mon Tue Wed Thu

// Small branches open days: Sat–Thu (no Fri)
const SMALL_OPEN = new Set([0, 1, 2, 3, 4, 6]) // all except Fri=5

// ── Default home branches per employee (user-defined, 2026-04-30) ─────────────
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
  'emp-41': 'br-07', // محمد ناصر محمد شحاته

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
export type ShiftType = 'A' | 'B' // A = Sat+Tue+Wed, B = Sun+Mon+Thu+Fri

export interface EmployeeAIConfig {
  employeeId: string
  homeBranchId: string  // for distance-based assignment
  shift: ShiftType       // starting shift on the first generated week
}

export interface VacationWeek {
  id: string
  employeeId: string
  weekStart: string // ISO Sunday date — covers 5 days Sun→Thu
}

export interface AIConfig {
  startDate: string         // ISO Sunday
  weeks: number             // 1–13
  empConfigs: EmployeeAIConfig[]
  vacations: VacationWeek[]
  visitCounts: Record<string, number> // cumulative visit history
  autoVacation: boolean     // if true, assign balanced vacations for employees missing one
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
  return i < 0 ? 5 : i
}

function geoDist(a: string, b: string): number {
  return Math.abs(geoIdx(a) - geoIdx(b))
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekDates(sun: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i))
}

function dow(iso: string): number {
  return new Date(iso).getDay()
}

function getSunday(iso: string): string {
  const d   = new Date(iso)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

// ── Auto vacation balancer ────────────────────────────────────────────────────
// For each eligible agent without a manual vacation in the period,
// assign a balanced random week (max ~2 employees/week on vacation).

export function autoAssignVacations(
  agents: Employee[],
  existingVacations: VacationWeek[],
  startDate: string,
  weeks: number,
): VacationWeek[] {
  const added: VacationWeek[] = []

  // Agents who already have a vacation in this period
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

  // Count how many vacations are already on each week
  const weekLoad: Record<string, number> = {}
  for (const sun of allSundays) weekLoad[sun] = 0
  for (const v of existingVacations) {
    if (allSundays.includes(v.weekStart)) {
      weekLoad[v.weekStart] = (weekLoad[v.weekStart] ?? 0) + 1
    }
  }

  // Max employees on vacation per week = ceil(agents.length / weeks) + 1
  const maxPerWeek = Math.ceil((needVacation.length + existingVacations.length) / weeks) + 1

  // Shuffle employees for randomness
  const shuffled = [...needVacation].sort(() => Math.random() - 0.5)

  for (const emp of shuffled) {
    // Pick the week with the fewest vacations (balanced)
    const available = allSundays.filter(sun => (weekLoad[sun] ?? 0) < maxPerWeek)
    if (!available.length) continue

    // Sort by load, then pick randomly among the least-loaded
    available.sort((a, b) => (weekLoad[a] ?? 0) - (weekLoad[b] ?? 0))
    const minLoad = weekLoad[available[0]] ?? 0
    const candidates = available.filter(s => (weekLoad[s] ?? 0) === minLoad)
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]

    weekLoad[chosen] = (weekLoad[chosen] ?? 0) + 1
    added.push({
      id: `auto-${emp.id}-${chosen}`,
      employeeId: emp.id,
      weekStart: chosen,
    })
  }

  return added
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateAISchedule(
  employees: Employee[],
  branches: Branch[],
  config: AIConfig,
): AIResult {
  const entries: ScheduleInput[] = []
  const warnings: AIWarning[] = []
  const visitCounts = { ...config.visitCounts }
  const weekVisits: WeekVisitInfo[] = []

  const brMap = new Map(branches.map(b => [b.id, b]))
  const cfgMap = new Map(config.empConfigs.map(c => [c.employeeId, c]))

  // ── Eligible employees ─────────────────────────────────────────────────────
  const eligible = employees.filter(e =>
    e.role !== 'Supervisor' &&
    (e.region ?? 'south') === 'south',
  )
  const agents = eligible.filter(e => e.role === 'Agent')

  // ── Auto-vacation ──────────────────────────────────────────────────────────
  let allVacations = [...config.vacations]
  let autoVacationsAdded: VacationWeek[] = []

  if (config.autoVacation) {
    autoVacationsAdded = autoAssignVacations(
      agents, config.vacations, config.startDate, config.weeks,
    )
    allVacations = [...allVacations, ...autoVacationsAdded]
  }

  // ── Vacation days set ──────────────────────────────────────────────────────
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

  // Visit pools
  const ibsAgents = agents.filter(e => classifyEmp(e) === 'IBS')
  const visitPool = agents.filter(e => {
    const home = cfgMap.get(e.id)?.homeBranchId
      ?? DEFAULT_HOME_BRANCHES[e.id]
      ?? e.branchId
      ?? 'br-05'
    return !SMALL_BRANCHES.has(home)
  })
  const weVisit  = visitPool.filter(e => classifyEmp(e) === 'WE')
  const ibsVisit = visitPool.filter(e => classifyEmp(e) === 'IBS')

  // ── Shift helpers ──────────────────────────────────────────────────────────
  function empShift(empId: string, weekOffset: number): ShiftType {
    if (empId === SENIOR_MALLAWY) return 'A' // uses own day set, shift irrelevant
    const base = cfgMap.get(empId)?.shift ?? 'A'
    return ((base === 'A' ? 0 : 1) + weekOffset) % 2 === 0 ? 'A' : 'B'
  }

  function isWorkDay(empId: string, date: string, weekOffset: number): boolean {
    if (empId === SENIOR_MALLAWY) return SENIOR_MALLAWY_DAYS.has(dow(date))
    const s = empShift(empId, weekOffset)
    return s === 'A' ? SHIFT_A.has(dow(date)) : SHIFT_B.has(dow(date))
  }

  function available(empId: string, date: string): boolean {
    return !vacDays.has(`${empId}:${date}`)
  }

  // ── Visit selector ─────────────────────────────────────────────────────────
  function pickVisit(usedIds: Set<string>): Employee | null {
    const weTotal  = weVisit.reduce((s, e) => s + (visitCounts[e.id]  ?? 0), 0)
    const ibsTotal = ibsVisit.reduce((s, e) => s + (visitCounts[e.id] ?? 0), 0)
    const pickWE   = ibsTotal === 0 || weTotal / (ibsTotal || 1) < 2
    const pool     = (pickWE ? weVisit : ibsVisit).filter(e => !usedIds.has(e.id))
    if (!pool.length) return null
    return pool.reduce((best, e) =>
      (visitCounts[e.id] ?? 0) < (visitCounts[best.id] ?? 0) ? e : best,
    )
  }

  // ── Week loop ──────────────────────────────────────────────────────────────
  const usedAsVisit = new Set<string>()

  for (let w = 0; w < config.weeks; w++) {
    const sun   = addDays(config.startDate, w * 7)
    const dates = weekDates(sun)

    // Minya senior pairing — swap each month relative to start month
    const startMonth = new Date(config.startDate).getMonth()
    const curMonth   = new Date(sun).getMonth()
    const swapped    = ((curMonth - startMonth + 12) % 12) % 2 === 1
    const pairBr05   = swapped ? SENIORS_MINYA_B : SENIORS_MINYA_A
    const pairBr06   = swapped ? SENIORS_MINYA_A : SENIORS_MINYA_B

    // Visit employee for this week
    const visitEmp = pickVisit(usedAsVisit)
    if (visitEmp) {
      usedAsVisit.add(visitEmp.id)
      visitCounts[visitEmp.id] = (visitCounts[visitEmp.id] ?? 0) + 1
      weekVisits.push({ weekStart: sun, employee: visitEmp, empType: classifyEmp(visitEmp) })
    }

    // ── Daily loop ───────────────────────────────────────────────────────────
    for (const date of dates) {
      const d         = dow(date)
      const usedToday = new Set<string>()

      // Visit employee
      if (visitEmp) {
        usedToday.add(visitEmp.id)
        if (isWorkDay(visitEmp.id, date, w) && available(visitEmp.id, date)) {
          entries.push({
            employeeId: visitEmp.id,
            branchId: 'br-05',
            date,
            cellType: 'visit',
            startTime: '09:00',
            endTime: '21:00',
            note: 'AI — زيارة خارجية',
          })
        }
      }

      // Senior Mallawy — Sun–Thu fixed
      if (SENIOR_MALLAWY_DAYS.has(d) && available(SENIOR_MALLAWY, date)) {
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

      // Minya rotating seniors
      for (const sid of pairBr05) {
        if (isWorkDay(sid, date, w) && available(sid, date)) {
          entries.push({
            employeeId: sid, branchId: 'br-05', date, cellType: 'branch',
            startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا',
          })
          usedToday.add(sid)
        }
      }
      for (const sid of pairBr06) {
        if (isWorkDay(sid, date, w) && available(sid, date)) {
          entries.push({
            employeeId: sid, branchId: 'br-06', date, cellType: 'branch',
            startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا الجديدة',
          })
          usedToday.add(sid)
        }
      }

      // ── Small branches (IBS, open Sat–Thu) ─────────────────────────────
      if (SMALL_OPEN.has(d)) {
        for (const brId of SMALL_BRANCHES) {
          const br        = brMap.get(brId)
          const candidate = ibsAgents
            .filter(e =>
              !usedToday.has(e.id) &&
              available(e.id, date) &&
              isWorkDay(e.id, date, w),
            )
            .sort((a, b) => {
              const ha = cfgMap.get(a.id)?.homeBranchId
                ?? DEFAULT_HOME_BRANCHES[a.id] ?? a.branchId ?? 'br-05'
              const hb = cfgMap.get(b.id)?.homeBranchId
                ?? DEFAULT_HOME_BRANCHES[b.id] ?? b.branchId ?? 'br-05'
              return geoDist(ha, brId) - geoDist(hb, brId)
            })[0]

          if (candidate) {
            entries.push({
              employeeId: candidate.id, branchId: brId, date, cellType: 'branch',
              startTime: '09:00', endTime: '16:00', note: 'AI — فرع صغير',
            })
            usedToday.add(candidate.id)
          } else {
            warnings.push({
              date, branchId: brId,
              branchNameAr: br?.storeNameAr ?? brId,
              need: 1, got: 0,
            })
          }
        }
      }

      // ── Main branches — agents ──────────────────────────────────────────
      const freeAgents = agents.filter(e =>
        !usedToday.has(e.id) &&
        available(e.id, date) &&
        isWorkDay(e.id, date, w),
      )
      const dayUsed = new Set<string>(usedToday)

      for (const brId of MAIN_BRANCH_ORDER) {
        const [min, max] = BRANCH_QUOTA[brId] ?? [1, 1]
        const br = brMap.get(brId)

        const pool = freeAgents
          .filter(e => !dayUsed.has(e.id))
          .sort((a, b) => {
            const ha = cfgMap.get(a.id)?.homeBranchId
              ?? DEFAULT_HOME_BRANCHES[a.id] ?? a.branchId ?? 'br-05'
            const hb = cfgMap.get(b.id)?.homeBranchId
              ?? DEFAULT_HOME_BRANCHES[b.id] ?? b.branchId ?? 'br-05'
            return geoDist(ha, brId) - geoDist(hb, brId)
          })

        let placed = 0
        for (const emp of pool) {
          if (placed >= max) break
          entries.push({
            employeeId: emp.id, branchId: brId, date, cellType: 'branch',
            startTime: '09:00', endTime: '21:00', note: 'AI Generated',
          })
          dayUsed.add(emp.id)
          placed++
        }

        if (placed < min) {
          warnings.push({
            date, branchId: brId,
            branchNameAr: br?.storeNameAr ?? brId,
            need: min, got: placed,
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

  const lastDate = workEntries[0].date
  const d        = dow(lastDate)
  const wasA     = SHIFT_A.has(d)

  const lastSun  = getSunday(lastDate)
  const startSun = getSunday(beforeDate)
  const weekDiff = Math.round(
    (new Date(startSun).getTime() - new Date(lastSun).getTime()) / (7 * 86400000),
  )

  const lastShift: ShiftType = wasA ? 'A' : 'B'
  return ((lastShift === 'A' ? 0 : 1) + weekDiff) % 2 === 0 ? 'A' : 'B'
}
