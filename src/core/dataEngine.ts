/**
 * dataEngine — Pure utility functions (no React hooks, no localStorage reads).
 * All functions take their data as parameters — region isolation is the caller's responsibility.
 *
 * Usage pattern in pages:
 *   const { entries } = useSchedule(region)          // region-scoped entries
 *   const scheduleLeaves = getLeaves('annual', entries) // pure, region-safe
 */

import type { Employee, Branch, ScheduleEntry } from '@/types/hr'
import { getEmpName } from '@/data/seedData'

// ── Kept for backwards-compatibility (EmployeesPage uses this signature) ──
// Reads from localStorage directly — only used when entries are not available.
import { EMPLOYEES, BRANCHES } from '@/data/seedData'
import { storage } from '@/lib/storage'

function getProfileRegistry(employees?: Employee[]): Map<string, Employee> {
  const list = employees ?? storage.get<Employee[]>('employees', EMPLOYEES)
  return new Map(list.map(e => [e.id, e]))
}

function getBranchRegistry(branches?: Branch[]): Map<string, Branch> {
  const list = (branches ?? storage.get<Branch[]>('branches', BRANCHES)).filter(b => b.id !== 'br-09')
  return new Map(list.map(b => [b.id, b]))
}

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC API — all functions accept entries / employees / branches params
// ─────────────────────────────────────────────────────────────────────────

/**
 * getAllEmployees()
 * Returns employees who appear in at least one schedule entry.
 * Pass the region-scoped entries from useSchedule(region).
 */
export function getAllEmployees(
  entries: ScheduleEntry[],
  employees?: Employee[],
): Employee[] {
  const profiles = getProfileRegistry(employees)
  const seenIds  = new Set(entries.map(e => e.employeeId))

  const result: Employee[] = []
  for (const id of seenIds) {
    const profile = profiles.get(id)
    if (profile) {
      result.push(profile)
    } else {
      result.push({
        id, user: id, domainName: id, name: id, nameEn: id,
        email: '', mobile: '', nationalId: '', employeeCode: '',
        level: 8, role: 'Agent',
      })
    }
  }
  return result.sort((a, b) =>
    (getEmpName(a)).localeCompare(getEmpName(b), 'ar'),
  )
}

/**
 * getAssignmentsByDate(date, entries, employees?, branches?)
 * Returns map of branchId → Employee[] for a given date.
 */
export function getAssignmentsByDate(
  date:       string,
  entries:    ScheduleEntry[],
  employees?: Employee[],
  branches?:  Branch[],
): Map<string, Employee[]> {
  const profiles = getProfileRegistry(employees)
  const bMap     = getBranchRegistry(branches)
  const result   = new Map<string, Employee[]>()

  for (const e of entries) {
    if (e.date !== date) continue
    const ct = e.cellType ?? 'branch'
    if (ct !== 'branch' && ct !== 'visit') continue
    if (!e.branchId) continue
    if (!bMap.has(e.branchId)) continue

    const emp = profiles.get(e.employeeId) ?? {
      id: e.employeeId, user: e.employeeId, domainName: e.employeeId,
      name: e.employeeId, nameEn: e.employeeId,
      email: '', mobile: '', nationalId: '', employeeCode: '', level: 8, role: 'Agent' as const,
    }
    const arr = result.get(e.branchId) ?? []
    if (!arr.some(x => x.id === emp.id)) arr.push(emp)
    result.set(e.branchId, arr)
  }
  return result
}

export type LeaveEntry = {
  employeeId:   string
  employeeName: string
  date:         string
  type:         string
  branchId:     string
  note:         string
}

/**
 * getLeaves(type?, entries, employees?)
 * Returns leave entries from schedule, optionally filtered by type.
 */
export function getLeaves(
  type?:      string,
  entries?:   ScheduleEntry[],
  employees?: Employee[],
): LeaveEntry[] {
  const allEntries = entries ?? []
  const profiles   = getProfileRegistry(employees)
  const LEAVE_TYPES = new Set(['annual', 'sick', 'casual', 'off'])

  return allEntries
    .filter(e => {
      const ct = e.cellType ?? 'branch'
      if (!LEAVE_TYPES.has(ct)) return false
      if (type && ct !== type) return false
      return true
    })
    .map(e => {
      const prof = profiles.get(e.employeeId)
      return {
        employeeId:   e.employeeId,
        employeeName: prof ? getEmpName(prof) : e.employeeId,
        date:         e.date,
        type:         e.cellType ?? 'branch',
        branchId:     e.branchId ?? '',
        note:         e.note ?? '',
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export type EmployeeDaySummary = {
  employeeId:   string
  employeeName: string
  branchId:     string
  branchName:   string
  days:         number
}

/**
 * getEmployeeDays(entries, employees?, branches?)
 * Returns distinct working days per employee per branch.
 */
export function getEmployeeDays(
  entries:    ScheduleEntry[],
  employees?: Employee[],
  branches?:  Branch[],
): EmployeeDaySummary[] {
  const profiles = getProfileRegistry(employees)
  const bMap     = getBranchRegistry(branches)
  const seen     = new Set<string>()
  const counts   = new Map<string, number>()

  for (const e of entries) {
    const ct = e.cellType ?? 'branch'
    if (ct !== 'branch' && ct !== 'visit') continue
    if (!e.branchId) continue
    if (!bMap.has(e.branchId)) continue

    const key = `${e.employeeId}|${e.branchId}|${e.date}`
    if (seen.has(key)) continue
    seen.add(key)
    const gk = `${e.employeeId}|${e.branchId}`
    counts.set(gk, (counts.get(gk) ?? 0) + 1)
  }

  const result: EmployeeDaySummary[] = []
  for (const [key, days] of counts) {
    const [employeeId, branchId] = key.split('|')
    const prof   = profiles.get(employeeId)
    const branch = bMap.get(branchId)
    result.push({
      employeeId,
      employeeName: prof ? getEmpName(prof) : employeeId,
      branchId,
      branchName: branch?.storeNameAr || branch?.storeName || branchId,
      days,
    })
  }
  return result.sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, 'ar') ||
    a.branchName.localeCompare(b.branchName, 'ar'),
  )
}
