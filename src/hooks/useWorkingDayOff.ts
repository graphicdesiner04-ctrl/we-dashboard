import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, WorkingDayOffRecord } from '@/types/hr'
import { WORKING_DAY_OFF_INITIAL } from '@/data/seedData'
import { storage } from '@/lib/storage'
import { useRegion } from '@/context/RegionContext'
import { loadAllEmployees, loadAllBranches } from '@/lib/regionHelpers'

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

  const [records, setRecords] = useState<WorkingDayOffRecord[]>(() => {
    const raw = storage.get<WorkingDayOffRecord[] | null>('wdo-records', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(r => r.id))
      const missing = WORKING_DAY_OFF_INITIAL.filter(s => !existingIds.has(s.id))
      return [...raw, ...missing]
    }
    return [...WORKING_DAY_OFF_INITIAL]
  })

  useEffect(() => { storage.set('wdo-records', records) }, [records])

  const addRecord = useCallback((input: WorkingDayOffInput) => {
    setRecords(prev => [{ id: uid(), ...input, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const addBulkRecords = useCallback((inputs: WorkingDayOffInput[]) => {
    if (inputs.length === 0) return
    const now = new Date().toISOString()
    setRecords(prev => {
      const existing = new Set(prev.map(r => `${r.employeeId}|${r.date}`))
      const toAdd = inputs
        .filter(inp => !existing.has(`${inp.employeeId}|${inp.date}`))
        .map(inp => ({ id: uid(), ...inp, createdAt: now }))
      return toAdd.length === 0 ? prev : [...toAdd, ...prev]
    })
  }, [])

  const updateRecord = useCallback((id: string, input: WorkingDayOffInput) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const empIds = useMemo(() => new Set(employees.map(e => e.id)), [employees])

  const year  = new Date().getFullYear().toString()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const currentMonthPrefix = `${year}-${month}`

  const currentYearRecords = useMemo(
    () => records.filter(r => r.date.startsWith(year) && empIds.has(r.employeeId)),
    [records, year, empIds],
  )

  const kpi = useMemo((): WorkingDayOffKPI => ({
    totalRecords:   currentYearRecords.length,
    uniqueWorkers:  new Set(currentYearRecords.map(r => r.employeeId)).size,
    thisMonthCount: records.filter(r => r.date.startsWith(currentMonthPrefix) && empIds.has(r.employeeId)).length,
  }), [currentYearRecords, records, currentMonthPrefix, empIds])

  return {
    employees, branches, records, currentYearRecords,
    kpi, addRecord, addBulkRecords, updateRecord, deleteRecord,
  }
}
