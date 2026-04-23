/**
 * getCurrentBranch.ts
 * Replaces the assignment-based getCurrentBranchId().
 *
 * Employee's current branch is now stored directly on employee.branchId.
 * This module provides a module-level helper (safe outside React)
 * and a React-friendly hook variant.
 */

import { storage } from '@/lib/storage'
import type { Employee } from '@/types/hr'

const ALL_EMP_SEEDS_KEY = 'employees'

/**
 * Reads employee.branchId directly from localStorage.
 * Safe to call outside React components.
 */
export function getCurrentBranchId(employeeId: string): string | null {
  const employees = storage.get<Employee[]>(ALL_EMP_SEEDS_KEY, [])
  const emp = employees.find(e => e.id === employeeId)
  return emp?.branchId ?? null
}
