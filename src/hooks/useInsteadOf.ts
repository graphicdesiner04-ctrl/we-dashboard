import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, InsteadOfRecord } from '@/types/hr'
import { INSTEAD_OF_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/hooks/useAssignments'
import { storage } from '@/lib/storage'
import { useRegion } from '@/context/RegionContext'
import { loadAllEmployees, loadAllBranches } from '@/lib/regionHelpers'

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

  const [records, setRecords] = useState<InsteadOfRecord[]>(() => {
    const raw = storage.get<InsteadOfRecord[] | null>('io-records', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(r => r.id))
      const missing = INSTEAD_OF_INITIAL.filter(s => !existingIds.has(s.id))
      return [...raw, ...missing]
    }
    return [...INSTEAD_OF_INITIAL]
  })

  useEffect(() => { storage.set('io-records', records) }, [records])

  const addRecord = useCallback((input: InsteadOfInput) => {
    setRecords(prev => [{ id: uid(), ...input, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: InsteadOfInput) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const resetRecords = useCallback(() => setRecords([]), [])

  const empIds = useMemo(() => new Set(employees.map(e => e.id)), [employees])

  const year = new Date().getFullYear().toString()
  const currentYearRecords = useMemo(
    () => records.filter(r => r.date.startsWith(year) && empIds.has(r.employeeId)),
    [records, year, empIds],
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
