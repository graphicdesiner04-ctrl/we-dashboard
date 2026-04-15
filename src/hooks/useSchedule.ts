import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, ScheduleEntry, ScheduleAlert } from '@/types/hr'
import { EMPLOYEES, BRANCHES } from '@/data/seedData'
import { storage } from '@/lib/storage'

function uid() {
  return `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type ScheduleInput = {
  employeeId: string
  branchId:   string
  date:       string
  note:       string
}

export function useSchedule() {
  const [employees] = useState<Employee[]>(
    () => storage.get<Employee[]>('employees', EMPLOYEES),
  )
  const [branches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES),
  )

  const [entries, setEntries] = useState<ScheduleEntry[]>(
    () => storage.get<ScheduleEntry[]>('schedule-entries', []),
  )

  useEffect(() => { storage.set('schedule-entries', entries) }, [entries])

  const addEntry = useCallback((input: ScheduleInput) => {
    setEntries(prev => [...prev, { id: uid(), ...input, createdAt: new Date().toISOString() }])
  }, [])

  // Add multiple entries at once (bulk schedule)
  const addEntries = useCallback((inputs: ScheduleInput[]) => {
    const now = new Date().toISOString()
    setEntries(prev => [
      ...prev,
      ...inputs.map(inp => ({ id: uid(), ...inp, createdAt: now })),
    ])
  }, [])

  const updateEntry = useCallback((id: string, input: ScheduleInput) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...input } : e))
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const resetEntries = useCallback(() => setEntries([]), [])

  // Compute OU-change alerts:
  // An alert fires when the scheduled branchId ≠ the employee's currently active assignment branch.
  // We read assignments fresh so we always reflect current state.
  const alerts = useMemo((): ScheduleAlert[] => {
    const assignments = storage.get<{ employeeId: string; branchId: string; toDate: string | null; fromDate: string }[]>(
      'assignments', [],
    )

    function currentBranch(employeeId: string): string | null {
      const open = assignments.filter(a => a.employeeId === employeeId && a.toDate === null)
      if (!open.length) return null
      return open.sort((a, b) => b.fromDate.localeCompare(a.fromDate))[0].branchId
    }

    const today = new Date().toISOString().slice(0, 10)
    // Only future (or today) entries
    return entries
      .filter(e => e.date >= today)
      .flatMap((entry): ScheduleAlert[] => {
        const curBranch = currentBranch(entry.employeeId)
        if (curBranch === null || curBranch === entry.branchId) return []
        return [{ entry, currentBranchId: curBranch, scheduledBranchId: entry.branchId }]
      })
      .sort((a, b) => a.entry.date.localeCompare(b.entry.date))
  }, [entries])

  return {
    employees, branches, entries,
    alerts, addEntry, addEntries, updateEntry, deleteEntry, resetEntries,
  }
}
