/**
 * useDataEngine — Central data layer
 * Schedule is the single source of truth for all derived data.
 */
import { useMemo } from 'react'
import { useSchedule } from '@/hooks/useSchedule'
import { EMPLOYEES, BRANCHES, getEmpName } from '@/data/seedData'
import type { ScheduleEntry } from '@/types/hr'

export type WorkDay = {
  employeeId: string
  branchId:   string
  date:       string
  cellType:   string
}

export type OUChangeAlert = {
  employeeId:   string
  employeeName: string
  fromBranchId: string
  fromBranch:   string
  toBranchId:   string
  toBranch:     string
  date:         string  // date of change
}

export type EmployeeStats = {
  employeeId:   string
  employeeName: string
  totalWorkDays: number
  annualDays:   number
  sickDays:     number
  visitDays:    number
  offDays:      number
  byBranch:     Record<string, number>  // branchId → unique working days
}

export type BranchStats = {
  branchId:      string
  branchName:    string
  totalDays:     number
  employeeCount: number
}

export function useDataEngine() {
  const { entries } = useSchedule()

  const branchMap = useMemo(() =>
    Object.fromEntries(BRANCHES.map(b => [b.id, b])), [])

  const empMap = useMemo(() =>
    Object.fromEntries(EMPLOYEES.map(e => [e.id, e])), [])

  // ── Working days (branch + visit only, unique per emp+branch+date) ──────
  const workDays = useMemo((): WorkDay[] => {
    const seen = new Set<string>()
    const result: WorkDay[] = []
    for (const e of entries) {
      const ct = e.cellType ?? 'branch'
      if ((ct === 'branch' || ct === 'visit') && e.branchId) {
        const key = `${e.employeeId}|${e.branchId}|${e.date}`
        if (!seen.has(key)) {
          seen.add(key)
          result.push({ employeeId: e.employeeId, branchId: e.branchId, date: e.date, cellType: ct })
        }
      }
    }
    return result
  }, [entries])

  // ── Employee stats ────────────────────────────────────────────────────
  const employeeStats = useMemo((): EmployeeStats[] => {
    const map: Record<string, EmployeeStats> = {}
    for (const emp of EMPLOYEES) {
      map[emp.id] = {
        employeeId: emp.id, employeeName: getEmpName(emp),
        totalWorkDays: 0, annualDays: 0, sickDays: 0, visitDays: 0, offDays: 0,
        byBranch: {},
      }
    }
    // Count unique work days per branch
    for (const wd of workDays) {
      if (!map[wd.employeeId]) continue
      map[wd.employeeId].totalWorkDays++
      map[wd.employeeId].byBranch[wd.branchId] = (map[wd.employeeId].byBranch[wd.branchId] || 0) + 1
    }
    // Count other types (all entries, no dedup needed for leaves)
    for (const e of entries) {
      if (!map[e.employeeId]) continue
      const ct = e.cellType ?? 'branch'
      if (ct === 'annual') map[e.employeeId].annualDays++
      if (ct === 'sick')   map[e.employeeId].sickDays++
      if (ct === 'visit')  map[e.employeeId].visitDays++
      if (ct === 'off')    map[e.employeeId].offDays++
    }
    return Object.values(map).filter(s => s.totalWorkDays + s.annualDays + s.sickDays + s.offDays > 0)
  }, [workDays, entries])

  // ── Branch stats ──────────────────────────────────────────────────────
  const branchStats = useMemo((): BranchStats[] => {
    const map: Record<string, { days: number; emps: Set<string> }> = {}
    for (const wd of workDays) {
      if (!map[wd.branchId]) map[wd.branchId] = { days: 0, emps: new Set() }
      map[wd.branchId].days++
      map[wd.branchId].emps.add(wd.employeeId)
    }
    return BRANCHES.filter(b => b.id !== 'br-09').map(b => ({
      branchId:      b.id,
      branchName:    b.storeNameAr || b.storeName,
      totalDays:     map[b.id]?.days ?? 0,
      employeeCount: map[b.id]?.emps.size ?? 0,
    }))
  }, [workDays])

  // ── OU Change detection ───────────────────────────────────────────────
  // An OU change is needed when an employee's branch changes from one day to the next
  const ouChangeAlerts = useMemo((): OUChangeAlert[] => {
    // Group entries by employee, sorted by date
    const byEmp: Record<string, ScheduleEntry[]> = {}
    for (const e of entries) {
      const ct = e.cellType ?? 'branch'
      if (ct !== 'branch' && ct !== 'visit') continue
      if (!e.branchId) continue
      if (!byEmp[e.employeeId]) byEmp[e.employeeId] = []
      byEmp[e.employeeId].push(e)
    }
    const alerts: OUChangeAlert[] = []
    const seen = new Set<string>()
    for (const [empId, empEntries] of Object.entries(byEmp)) {
      const sorted = [...empEntries].sort((a, b) => a.date.localeCompare(b.date))
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]
        const curr = sorted[i]
        if (prev.branchId !== curr.branchId) {
          const key = `${empId}|${prev.branchId}|${curr.branchId}|${curr.date}`
          if (!seen.has(key)) {
            seen.add(key)
            const emp = empMap[empId]
            const fromBr = branchMap[prev.branchId!]
            const toBr   = branchMap[curr.branchId!]
            alerts.push({
              employeeId:   empId,
              employeeName: emp ? getEmpName(emp) : empId,
              fromBranchId: prev.branchId!,
              fromBranch:   fromBr?.storeNameAr || fromBr?.storeName || prev.branchId!,
              toBranchId:   curr.branchId!,
              toBranch:     toBr?.storeNameAr  || toBr?.storeName  || curr.branchId!,
              date:         curr.date,
            })
          }
        }
      }
    }
    // Sort by date
    return alerts.sort((a, b) => a.date.localeCompare(b.date))
  }, [entries, empMap, branchMap])

  // ── Today's assignments ───────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const todayAssignments = useMemo(() => {
    const result: Record<string, string[]> = {}  // branchId → employeeIds
    for (const e of entries) {
      if (e.date !== today) continue
      const ct = e.cellType ?? 'branch'
      if (ct !== 'branch' && ct !== 'visit') continue
      if (!e.branchId) continue
      if (!result[e.branchId]) result[e.branchId] = []
      result[e.branchId].push(e.employeeId)
    }
    return result
  }, [entries, today])

  // ── Annual leaves from schedule ───────────────────────────────────────
  const annualLeavesFromSchedule = useMemo(() => {
    return entries.filter(e => e.cellType === 'annual').map(e => ({
      employeeId: e.employeeId,
      date:       e.date,
      branchId:   e.branchId || '',
    }))
  }, [entries])

  return {
    entries,
    workDays,
    employeeStats,
    branchStats,
    ouChangeAlerts,
    todayAssignments,
    annualLeavesFromSchedule,
    empMap,
    branchMap,
    EMPLOYEES: EMPLOYEES.filter(() => true),
    BRANCHES:  BRANCHES.filter(b => b.id !== 'br-09'),
  }
}
