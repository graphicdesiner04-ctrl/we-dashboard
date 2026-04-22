import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, InsteadOfRecord } from '@/types/hr'
import { INSTEAD_OF_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/hooks/useAssignments'
import { storage } from '@/lib/storage'
import { useRegion } from '@/context/RegionContext'
import { loadAllEmployees, loadAllBranches } from '@/lib/regionHelpers'
import { syncIoAdd, syncIoUpdate, syncIoRemove } from '@/lib/scheduleSync'

function uid() {
  return `io-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type InsteadOfInput = {
  employeeId:       string
  branchId?:        string
  date:             string
  replacementDate?: string
  note:             string
}

export interface InsteadOfSummary {
  employee:          Employee
  currentBranchId:   string | null
  workedCount:       number
  compensatoryGiven: number
  remainingOwed:     number
}

export interface InsteadOfKPI {
  totalRecords:   number
  uniqueWorkers:  number
  totalOwed:      number
  totalGiven:     number
}

export function useInsteadOf() {
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
  const [_allRecords, _setAllRecords] = useState<InsteadOfRecord[]>(() => {
    const raw = storage.get<InsteadOfRecord[] | null>('io-records', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(r => r.id))
      const missing = INSTEAD_OF_INITIAL.filter(s => !existingIds.has(s.id))
      return [...raw, ...missing]
    }
    return [...INSTEAD_OF_INITIAL]
  })

  useEffect(() => { storage.set('io-records', _allRecords) }, [_allRecords])

  // Region-isolated records — only current region's employees
  const records = useMemo(
    () => _allRecords.filter(r => empIds.has(r.employeeId)),
    [_allRecords, empIds],
  )

  const addRecord = useCallback((input: InsteadOfInput) => {
    const id = uid()
    _setAllRecords(prev => [{ id, ...input, createdAt: new Date().toISOString() }, ...prev])
    syncIoAdd(region, id, input.employeeId, input.date, input.branchId, input.replacementDate, input.note)
  }, [region])

  const updateRecord = useCallback((id: string, input: InsteadOfInput) => {
    _setAllRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
    syncIoUpdate(region, id, input.employeeId, input.date, input.branchId, input.replacementDate, input.note)
  }, [region])

  const deleteRecord = useCallback((id: string) => {
    _setAllRecords(prev => prev.filter(r => r.id !== id))
    syncIoRemove(region, id)
  }, [region])

  const resetRecords = useCallback(() => {
    // Only reset current region's records
    _setAllRecords(prev => prev.filter(r => !empIds.has(r.employeeId)))
  }, [empIds])

  const year = new Date().getFullYear().toString()
  const currentYearRecords = useMemo(
    () => records.filter(r => r.date.startsWith(year)),
    [records, year],
  )

  const summaries = useMemo((): InsteadOfSummary[] =>
    employees.map(emp => {
      const empRecs           = currentYearRecords.filter(r => r.employeeId === emp.id)
      const workedCount       = empRecs.length
      const compensatoryGiven = empRecs.filter(r => !!r.replacementDate).length
      return {
        employee:          emp,
        currentBranchId:   getCurrentBranchId(emp.id),
        workedCount,
        compensatoryGiven,
        remainingOwed:     workedCount - compensatoryGiven,
      }
    }),
    [employees, currentYearRecords],
  )

  const kpi = useMemo((): InsteadOfKPI => ({
    totalRecords:  currentYearRecords.length,
    uniqueWorkers: new Set(currentYearRecords.map(r => r.employeeId)).size,
    totalGiven:    currentYearRecords.filter(r => !!r.replacementDate).length,
    totalOwed:     currentYearRecords.filter(r => !r.replacementDate).length,
  }), [currentYearRecords])

  return {
    employees, branches, records, currentYearRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
  }
}
