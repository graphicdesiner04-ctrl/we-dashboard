import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, ScheduleEntry, ScheduleAlert, ScheduleCellType } from '@/types/hr'
import { EMPLOYEES, BRANCHES, SEED_SCHEDULE_ENTRIES } from '@/data/seedData'
import { storage } from '@/lib/storage'

function uid() {
  return `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type ScheduleInput = {
  employeeId: string
  branchId?:  string
  date:       string
  cellType:   ScheduleCellType
  startTime?: string
  endTime?:   string
  note:       string
}

export function useSchedule() {
  const [employees] = useState<Employee[]>(
    () => storage.get<Employee[]>('employees', EMPLOYEES),
  )
  const [branches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES),
  )

  const [entries, setEntries] = useState<ScheduleEntry[]>(() => {
    const raw = storage.get<ScheduleEntry[] | null>('schedule-entries', null)
    if (raw !== null && Array.isArray(raw)) return raw.map(e => ({ ...e, cellType: e.cellType ?? 'branch' }))
    // First visit — load seed data from HTML schedule
    return (SEED_SCHEDULE_ENTRIES as unknown as ScheduleEntry[])
  })

  useEffect(() => { storage.set('schedule-entries', entries) }, [entries])

  const addEntry = useCallback((input: ScheduleInput) => {
    setEntries(prev => [...prev, { id: uid(), ...input, note: input.note ?? '', createdAt: new Date().toISOString() }])
  }, [])

  const addEntries = useCallback((inputs: ScheduleInput[]) => {
    const now = new Date().toISOString()
    setEntries(prev => [
      ...prev,
      ...inputs.map(inp => ({ id: uid(), ...inp, note: inp.note ?? '', createdAt: now })),
    ])
  }, [])

  // Replace all entries for given dates, then add new ones
  const overwriteEntries = useCallback((inputs: ScheduleInput[], dates: string[]) => {
    const now = new Date().toISOString()
    const dateSet = new Set(dates)
    setEntries(prev => {
      const kept = prev.filter(e => !dateSet.has(e.date))
      const added = inputs.map(inp => ({ id: uid(), ...inp, note: inp.note ?? '', createdAt: now }))
      return [...kept, ...added]
    })
  }, [])

  const updateEntry = useCallback((id: string, input: ScheduleInput) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...input } : e))
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const resetEntries = useCallback(() => setEntries([]), [])

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
    return entries
      .filter(e => e.date >= today && (e.cellType === 'branch' || !e.cellType) && !!e.branchId)
      .flatMap((entry): ScheduleAlert[] => {
        const curBranch = currentBranch(entry.employeeId)
        if (curBranch === null || curBranch === entry.branchId) return []
        return [{ entry, currentBranchId: curBranch, scheduledBranchId: entry.branchId! }]
      })
      .sort((a, b) => a.entry.date.localeCompare(b.entry.date))
  }, [entries])

  return {
    employees, branches, entries,
    alerts, addEntry, addEntries, overwriteEntries,
    updateEntry, deleteEntry, resetEntries,
  }
}
