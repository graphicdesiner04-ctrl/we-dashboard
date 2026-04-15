import { useState, useCallback, useEffect } from 'react'
import type { AssignmentHistory } from '@/types/hr'
import { ASSIGNMENT_HISTORY } from '@/data/seedData'
import { storage } from '@/lib/storage'

function uid() {
  return `as-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Module-level helper ────────────────────────────────────────────────────
// Reads fresh from localStorage on every call — safe to use outside React.
export function getCurrentBranchId(employeeId: string): string | null {
  const assignments = storage.get<AssignmentHistory[]>('assignments', ASSIGNMENT_HISTORY)
  const open = assignments.filter(
    a => a.employeeId === employeeId && a.toDate === null,
  )
  if (!open.length) return null
  return open.sort((a, b) => b.fromDate.localeCompare(a.fromDate))[0].branchId
}

export type AssignmentInput = {
  employeeId: string
  branchId: string
  fromDate: string
  toDate: string | null
  note: string
}

export function useAssignments() {
  const [assignments, setAssignments] = useState<AssignmentHistory[]>(
    () => storage.get<AssignmentHistory[]>('assignments', ASSIGNMENT_HISTORY),
  )

  useEffect(() => { storage.set('assignments', assignments) }, [assignments])

  const addAssignment = useCallback((input: AssignmentInput) => {
    setAssignments(prev => [...prev, { id: uid(), ...input }])
  }, [])

  const updateAssignment = useCallback((id: string, input: Partial<AssignmentInput>) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...input } : a))
  }, [])

  const deleteAssignment = useCallback((id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id))
  }, [])

  // Live version (reactive to component state)
  function getCurrentBranchIdLive(employeeId: string): string | null {
    const open = assignments.filter(a => a.employeeId === employeeId && a.toDate === null)
    if (!open.length) return null
    return open.sort((a, b) => b.fromDate.localeCompare(a.fromDate))[0].branchId
  }

  return {
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    getCurrentBranchId: getCurrentBranchIdLive,
  }
}
