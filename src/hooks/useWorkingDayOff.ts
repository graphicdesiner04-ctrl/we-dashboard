import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, WorkingDayOffRecord } from '@/types/hr'
import { WORKING_DAY_OFF_INITIAL } from '@/data/seedData'
import { storage } from '@/lib/storage'
import { useRegion } from '@/context/RegionContext'
import { loadAllEmployees, loadAllBranches } from '@/lib/regionHelpers'
import { syncWdoAdd, syncWdoUpdate, syncWdoRemove } from '@/lib/scheduleSync'

function uid() {
  return `wdo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type WorkingDayOffInput = {
  employeeId: string
  branchId:   string
  date:       string
  note:       string
}

export interface WorkingDayOffKPI {
  totalRecords:   number
  uniqueWorkers:  number
  thisMonthCount: number
}

export function useWorkingDayOff() {
  const { region } = useRegion()

  const [allEmployees] = useState<Employee[]>(loadAllEmployees)
  const employees = useMemo(
    () => allEmployees.filter(e => (e.region ?? 'south') === region),
    [allEmployees, region],
  )

  const [allBranches] = useState<Branch[]>(loadAllBranches)
  const branches = useMemo(
    () => allBranches.filter(b => (b.region ?? 'south') === region),
    [allBranches, region],
  )

  // empIds for region isolation
  const empIds = useMemo(() => new Set(employees.map(e => e.id)), [employees])

  // Internal state — holds ALL records from storage (both regions)
  const [_allRecords, _setAllRecords] = useState<WorkingDayOffRecord[]>(() => {
    const raw = storage.get<WorkingDayOffRecord[] | null>('wdo-records', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(r => r.id))
      const missing = WORKING_DAY_OFF_INITIAL.filter(s => !existingIds.has(s.id))
      return [...raw, ...missing]
    }
    return [...WORKING_DAY_OFF_INITIAL]
  })

  useEffect(() => { storage.set('wdo-records', _allRecords) }, [_allRecords])

  // Region-isolated records — only current region's employees
  const records = useMemo(
    () => _allRecords.filter(r => empIds.has(r.employeeId)),
    [_allRecords, empIds],
  )

  const addRecord = useCallback((input: WorkingDayOffInput) => {
    const id = uid()
    _setAllRecords(prev => [{ id, ...input, createdAt: new Date().toISOString() }, ...prev])
    syncWdoAdd(region, id, input.employeeId, input.branchId, input.date, input.note)
  }, [region])

  const addBulkRecords = useCallback((inputs: WorkingDayOffInput[]) => {
    if (inputs.length === 0) return
    const now = new Date().toISOString()
    _setAllRecords(prev => {
      const existing = new Set(prev.map(r => `${r.employeeId}|${r.date}`))
      const toAdd = inputs
        .filter(inp => !existing.has(`${inp.employeeId}|${inp.date}`))
        .map(inp => ({ id: uid(), ...inp, createdAt: now }))
      toAdd.forEach(r => syncWdoAdd(region, r.id, r.employeeId, r.branchId, r.date, r.note))
      return toAdd.length === 0 ? prev : [...toAdd, ...prev]
    })
  }, [region])

  const updateRecord = useCallback((id: string, input: WorkingDayOffInput) => {
    _setAllRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
    syncWdoUpdate(region, id, input.employeeId, input.branchId, input.date, input.note)
  }, [region])

  const deleteRecord = useCallback((id: string) => {
    _setAllRecords(prev => prev.filter(r => r.id !== id))
    syncWdoRemove(region, id)
  }, [region])

  const year  = new Date().getFullYear().toString()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const currentMonthPrefix = `${year}-${month}`

  const currentYearRecords = useMemo(
    () => records.filter(r => r.date.startsWith(year)),
    [records, year],
  )

  const kpi = useMemo((): WorkingDayOffKPI => ({
    totalRecords:   currentYearRecords.length,
    uniqueWorkers:  new Set(currentYearRecords.map(r => r.employeeId)).size,
    thisMonthCount: records.filter(r => r.date.startsWith(currentMonthPrefix)).length,
  }), [currentYearRecords, records, currentMonthPrefix])

  return {
    employees, branches, records, currentYearRecords,
    kpi, addRecord, addBulkRecords, updateRecord, deleteRecord,
  }
}
