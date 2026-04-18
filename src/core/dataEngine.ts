/**
 * dataEngine — Schedule is the ONLY source of truth.
 *
 * All functions read directly from localStorage (no React hooks).
 * Employees, assignments, leaves, and work-day counts are
 * ALL derived from schedule entries.
 *
 * Storage keys (prefix "we-ts-"):
 *   we-ts-schedule-entries  → ScheduleEntry[]
 *   we-ts-employees         → Employee[] (profile registry — names/emails only)
 *   we-ts-branches          → Branch[]
 */

import type { Employee, Branch, ScheduleEntry } from '@/types/hr'
import { EMPLOYEES, BRANCHES } from '@/data/seedData'

const PREFIX = 'we-ts-'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ── Raw schedule entries ──────────────────────────────────────────────────

function getEntries(): ScheduleEntry[] {
  return read<ScheduleEntry[]>('schedule-entries', [])
}

// ── Employee profile registry ─────────────────────────────────────────────
// Used only for name / email lookup. NOT the authoritative employee list.

function getProfileRegistry(): Map<string, Employee> {
  const list = read<Employee[]>('employees', EMPLOYEES)
  return new Map(list.map(e => [e.id, e]))
}

// ── Branch registry ───────────────────────────────────────────────────────

function getBranchRegistry(): Map<string, Branch> {
  const list = read<Branch[]>('branches', BRANCHES).filter(b => b.id !== 'br-09')
  return new Map(list.map(b => [b.id, b]))
}

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────

/**
 * getAllEmployees()
 * Returns ONLY employees who appear in at least one schedule entry.
 * List is derived from schedule — not from a static array.
 */
export function getAllEmployees(): Employee[] {
  const entries  = getEntries()
  const profiles = getProfileRegistry()

  // Unique employee IDs from schedule
  const seenIds = new Set(entries.map(e => e.employeeId))

  const result: Employee[] = []
  for (const id of seenIds) {
    const profile = profiles.get(id)
    if (profile) {
      result.push(profile)
    } else {
      // Employee has schedule entries but no profile → create minimal stub
      result.push({
        id,
        user:        id,
        domainName:  id,
        name:        id,
        nameEn:      id,
        email:       '',
        mobile:      '',
        nationalId:  '',
        employeeCode:'',
        level:       8,
        role:        'Agent',
      })
    }
  }

  // Sort by name
  return result.sort((a, b) => (a.name || a.nameEn || '').localeCompare(b.name || b.nameEn || '', 'ar'))
}

/**
 * getAssignmentsByDate(date)
 * Returns map of branchId → Employee[] for a given date.
 * Source: schedule entries with cellType = 'branch' | 'visit'.
 */
export function getAssignmentsByDate(date: string): Map<string, Employee[]> {
  const entries  = getEntries()
  const profiles = getProfileRegistry()
  const branches = getBranchRegistry()

  const result = new Map<string, Employee[]>()

  for (const e of entries) {
    if (e.date !== date) continue
    const ct = e.cellType ?? 'branch'
    if (ct !== 'branch' && ct !== 'visit') continue
    if (!e.branchId) continue
    if (!branches.has(e.branchId)) continue  // skip removed branches (br-09)

    const emp = profiles.get(e.employeeId) ?? {
      id: e.employeeId, user: e.employeeId, domainName: e.employeeId,
      name: e.employeeId, nameEn: e.employeeId,
      email: '', mobile: '', nationalId: '', employeeCode: '', level: 8, role: 'Agent' as const,
    }

    const arr = result.get(e.branchId) ?? []
    // Deduplicate
    if (!arr.some(x => x.id === emp.id)) arr.push(emp)
    result.set(e.branchId, arr)
  }

  return result
}

/**
 * getLeaves()
 * Returns all leave entries from schedule.
 * type: 'annual' | 'sick' | 'casual' | 'off'
 */
export type LeaveEntry = {
  employeeId:   string
  employeeName: string
  date:         string
  type:         string
  branchId:     string
  note:         string
}

export function getLeaves(type?: string): LeaveEntry[] {
  const entries  = getEntries()
  const profiles = getProfileRegistry()

  const LEAVE_TYPES = new Set(['annual', 'sick', 'casual', 'off'])

  return entries
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
        employeeName: prof?.name || prof?.nameEn || e.employeeId,
        date:         e.date,
        type:         e.cellType ?? 'branch',
        branchId:     e.branchId ?? '',
        note:         e.note ?? '',
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * getEmployeeDays()
 * Returns distinct working days per employee per branch.
 * Counts unique (employeeId, branchId, date) — no double-counting.
 */
export type EmployeeDaySummary = {
  employeeId:   string
  employeeName: string
  branchId:     string
  branchName:   string
  days:         number
}

export function getEmployeeDays(): EmployeeDaySummary[] {
  const entries  = getEntries()
  const profiles = getProfileRegistry()
  const branches = getBranchRegistry()

  // Unique key set to avoid counting duplicates
  const seen  = new Set<string>()
  const counts = new Map<string, number>()  // key → count

  for (const e of entries) {
    const ct = e.cellType ?? 'branch'
    if (ct !== 'branch' && ct !== 'visit') continue
    if (!e.branchId) continue
    if (!branches.has(e.branchId)) continue  // skip br-09

    const key = `${e.employeeId}|${e.branchId}|${e.date}`
    if (seen.has(key)) continue
    seen.add(key)

    const groupKey = `${e.employeeId}|${e.branchId}`
    counts.set(groupKey, (counts.get(groupKey) ?? 0) + 1)
  }

  const result: EmployeeDaySummary[] = []
  for (const [key, days] of counts) {
    const [employeeId, branchId] = key.split('|')
    const prof   = profiles.get(employeeId)
    const branch = branches.get(branchId)
    result.push({
      employeeId,
      employeeName: prof?.name || prof?.nameEn || employeeId,
      branchId,
      branchName:   branch?.storeNameAr || branch?.storeName || branchId,
      days,
    })
  }

  // Sort by employee name then branch
  return result.sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, 'ar') || a.branchName.localeCompare(b.branchName, 'ar'),
  )
}
