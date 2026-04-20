// ── Region-aware storage helpers ──────────────────────────────────────────
// Shared initializers for hooks that need region-filtered employees/branches.
import type { Employee, Branch } from '@/types/hr'
import { EMPLOYEES, BRANCHES, NORTH_EMPLOYEES, NORTH_BRANCHES } from '@/data/seedData'
import { storage } from '@/lib/storage'

export function loadAllEmployees(): Employee[] {
  const ALL = [...EMPLOYEES, ...NORTH_EMPLOYEES]
  const raw = storage.get<Employee[] | null>('employees', null)
  if (raw !== null && Array.isArray(raw)) {
    const existingIds = new Set(raw.map(e => e.id))
    const missing = ALL.filter(e => !existingIds.has(e.id))
    return missing.length > 0 ? [...raw, ...missing] : raw
  }
  return [...ALL]
}

export function loadAllBranches(): Branch[] {
  const ALL = [...BRANCHES, ...NORTH_BRANCHES]
  const raw = storage.get<Branch[] | null>('branches', null)
  if (raw !== null && Array.isArray(raw)) {
    const existingIds = new Set(raw.map(b => b.id))
    const missing = ALL.filter(b => !existingIds.has(b.id))
    return missing.length > 0 ? [...raw, ...missing] : raw
  }
  return [...ALL]
}
