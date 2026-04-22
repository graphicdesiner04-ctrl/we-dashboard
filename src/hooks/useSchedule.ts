import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, ScheduleEntry, ScheduleAlert, ScheduleCellType, Region } from '@/types/hr'
import {
  EMPLOYEES, BRANCHES, SEED_SCHEDULE_ENTRIES, FIRST_SCHEDULE_ENTRIES,
  NORTH_EMPLOYEES, NORTH_BRANCHES,
} from '@/data/seedData'
import { NORTH_Q1_ENTRIES } from '@/data/northScheduleQ1'
import { NORTH_Q2_ENTRIES } from '@/data/northScheduleQ2'
import { storage } from '@/lib/storage'
import { SCHEDULE_SYNC_EVENT } from '@/lib/scheduleSync'

function uid() {
  return `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type ScheduleInput = {
  employeeId:          string
  branchId?:           string
  date:                string
  cellType:            ScheduleCellType
  startTime?:          string
  endTime?:            string
  note:                string
  swapWithEmployeeId?: string   // for 'swap' type
}

export function useSchedule(region: Region = 'south') {
  const storageKey = region === 'north' ? 'north-schedule-entries' : 'schedule-entries'

  const [employees] = useState<Employee[]>(() => {
    const all = storage.get<Employee[]>('employees', region === 'north' ? NORTH_EMPLOYEES : EMPLOYEES)
    return all.filter(e => (e.region ?? 'south') === region)
  })

  const [branches] = useState<Branch[]>(() => {
    const all = storage.get<Branch[]>('branches', region === 'north' ? NORTH_BRANCHES : BRANCHES)
    return all.filter(b => (b.region ?? 'south') === region)
  })

  const [entries, setEntries] = useState<ScheduleEntry[]>(() => {
    // Seed entries for this region
    const ALL_SEEDS: ScheduleEntry[] = region === 'north'
      ? [
          ...(NORTH_Q1_ENTRIES as unknown as ScheduleEntry[]),
          ...(NORTH_Q2_ENTRIES as unknown as ScheduleEntry[]),
        ]
      : [
          ...(FIRST_SCHEDULE_ENTRIES as unknown as ScheduleEntry[]),
          ...(SEED_SCHEDULE_ENTRIES  as unknown as ScheduleEntry[]),
        ]

    const raw = storage.get<ScheduleEntry[] | null>(storageKey, null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(e => e.id))
      const tombstoned = storage.tombstoneGet(storageKey)
      const missing = ALL_SEEDS.filter(s => !existingIds.has(s.id) && !tombstoned.has(s.id))
      return [...raw.map(e => ({ ...e, cellType: e.cellType ?? 'branch' })), ...missing]
    }
    return ALL_SEEDS
  })

  useEffect(() => { storage.set(storageKey, entries) }, [entries, storageKey])

  // ── Real-time sync listener ──────────────────────────────────────────────
  // When another module (useWorkingDayOff, useAnnualLeave, etc.) writes a
  // sync entry to localStorage, it dispatches SCHEDULE_SYNC_EVENT.
  // We re-read from storage so the schedule grid updates immediately without
  // requiring the user to navigate away and back.
  useEffect(() => {
    function onSync(e: Event) {
      const { region: r } = (e as CustomEvent<{ region: Region }>).detail
      if (r !== region) return
      const raw = storage.get<ScheduleEntry[] | null>(storageKey, null)
      if (!raw) return
      setEntries(raw.map(e => ({ ...e, cellType: e.cellType ?? 'branch' })))
    }
    window.addEventListener(SCHEDULE_SYNC_EVENT, onSync)
    return () => window.removeEventListener(SCHEDULE_SYNC_EVENT, onSync)
  }, [region, storageKey])

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
    storage.tombstoneAdd(storageKey, id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [storageKey])

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
