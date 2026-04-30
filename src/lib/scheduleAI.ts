// ── WE AI Schedule Generator ─────────────────────────────────────────────────
// Algorithmic schedule generation for South region.
// Rules: FINAL SYSTEM doc 2026-04-30

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
export const SENIOR_MALLAWY = 'emp-15' // Ahmed Hassan — fixed ملوي, always Week 1
// Monthly-rotating Minya seniors (pairs swap each month)
// Pair A → br-05, Pair B → br-06 (then swap next month)
export const SENIORS_MINYA_A = ['emp-13', 'emp-16'] // Ahmed Galal, Ali Mahrous
export const SENIORS_MINYA_B = ['emp-14', 'emp-17'] // Mohamed Hisham, Ahmed Alaa

export const ALL_SENIORS_MINYA = [...SENIORS_MINYA_A, ...SENIORS_MINYA_B]

// ── Shift day sets (JS: 0=Sun 1=Mon … 6=Sat) ─────────────────────────────────
const W1 = new Set([0, 1, 4, 5, 6]) // Week1: Sun Mon Thu Fri Sat
const W2 = new Set([2, 3])           // Week2: Tue Wed  (exact reverse of W1)
const SMALL_OPEN = new Set([0, 1, 2, 3, 4, 6]) // Sat–Thu (no Fri=5)

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmployeeType = 'WE' | 'IBS'
export type WeekParity = 1 | 2

export interface EmployeeAIConfig {
  employeeId: string
  homeBranchId: string  // for distance-based assignment
  weekParity: WeekParity // parity on the FIRST generated week
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function classifyEmp(emp: Employee): EmployeeType {
  return /\d/.test(emp.user) ? 'IBS' : 'WE'
}

function geoIdx(brId: string): number {
  const i = GEO_ORDER.indexOf(brId)
  return i < 0 ? 5 : i // default near المنيا
}

function geoDist(a: string, b: string): number {
  return Math.abs(geoIdx(a) - geoIdx(b))
}

function addDays(iso: string, n: number): string {
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

  // ── Vacation days ──────────────────────────────────────────────────────────
  const vacDays = new Set<string>()
  for (const v of config.vacations) {
    for (let i = 0; i < 5; i++) {
      const d = addDays(v.weekStart, i)
      vacDays.add(`${v.employeeId}:${d}`)
      entries.push({
        employeeId: v.employeeId,
        date: d,
        cellType: 'annual',
        note: 'AI — إجازة سنوية',
      })
    }
  }

  // ── Eligible employees ─────────────────────────────────────────────────────
  const eligible = employees.filter(e =>
    e.role !== 'Supervisor' &&
    (e.region ?? 'south') === 'south',
  )
  const agents = eligible.filter(e => e.role === 'Agent')
  const ibsAgents = agents.filter(e => classifyEmp(e) === 'IBS')

  // Visit pool: agents whose home is NOT a small branch
  const visitPool = agents.filter(e => {
    const home = cfgMap.get(e.id)?.homeBranchId ?? e.branchId ?? 'br-05'
    return !SMALL_BRANCHES.has(home)
  })
  const weVisit  = visitPool.filter(e => classifyEmp(e) === 'WE')
  const ibsVisit = visitPool.filter(e => classifyEmp(e) === 'IBS')

  // ── Parity helpers ─────────────────────────────────────────────────────────
  function empParity(empId: string, weekOffset: number): WeekParity {
    if (empId === SENIOR_MALLAWY) return 1 // always W1
    const base = cfgMap.get(empId)?.weekParity ?? 1
    return (((base - 1 + weekOffset) % 2) + 1) as WeekParity
  }

  function isWorkDay(empId: string, date: string, weekOffset: number): boolean {
    const p = empParity(empId, weekOffset)
    const d = dow(date)
    return p === 1 ? W1.has(d) : W2.has(d)
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

      // Mark visit employee
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

      // ── Senior Mallawy (emp-15) — always W1 ────────────────────────────
      if (W1.has(d) && available(SENIOR_MALLAWY, date)) {
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

      // ── Minya rotating seniors ──────────────────────────────────────────
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
              const ha = cfgMap.get(a.id)?.homeBranchId ?? a.branchId ?? 'br-05'
              const hb = cfgMap.get(b.id)?.homeBranchId ?? b.branchId ?? 'br-05'
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

      // ── Main branches ───────────────────────────────────────────────────
      // Remaining agents available today
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
            const ha = cfgMap.get(a.id)?.homeBranchId ?? a.branchId ?? 'br-05'
            const hb = cfgMap.get(b.id)?.homeBranchId ?? b.branchId ?? 'br-05'
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

  return { entries, warnings, visitCounts, weekVisits }
}

// ── Utility: detect current parity from existing entries ──────────────────────
// Looks at the last known work-day entry before startDate and infers parity.
export function inferParity(
  empId: string,
  existingEntries: Array<{ employeeId: string; date: string; cellType: string }>,
  beforeDate: string,
): WeekParity {
  const workEntries = existingEntries
    .filter(e => e.employeeId === empId && e.cellType === 'branch' && e.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!workEntries.length) return 1

  const lastDate = workEntries[0].date
  const d        = dow(lastDate)
  // If last work day was in W1 set → was on W1 that week
  // Then determine parity of the generation start week relative to that week
  const wasW1 = W1.has(d)

  const lastSun  = getSunday(lastDate)
  const startSun = getSunday(beforeDate)
  const weekDiff = Math.round(
    (new Date(startSun).getTime() - new Date(lastSun).getTime()) / (7 * 86400000),
  )

  const lastParity: WeekParity = wasW1 ? 1 : 2
  return (((lastParity - 1 + weekDiff) % 2) + 1) as WeekParity
}

function getSunday(iso: string): string {
  const d   = new Date(iso)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}
