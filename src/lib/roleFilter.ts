/**
 * Role-based employee visibility filter
 *
 * Hierarchy:
 *   Super (Supervisor) → sees Senior + Agent employees
 *   Senior             → sees Agent employees only
 *   Other / unknown    → no restriction (fallback)
 */
import type { Employee } from '@/types/hr'

export function filterByViewRole(
  employees: Employee[],
  userRole?: string | null,
): Employee[] {
  if (userRole === 'Super') {
    return employees.filter(e => e.role === 'Senior' || e.role === 'Agent' || !e.role)
  }
  if (userRole === 'Senior') {
    return employees.filter(e => e.role === 'Agent' || !e.role)
  }
  // Default: no filter (show all)
  return employees
}
