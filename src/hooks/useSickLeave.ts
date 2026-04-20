import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, SickLeaveRecord } from '@/types/hr'
import { SICK_LEAVE_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/hooks/useAssignments'
import { storage } from '@/lib/storage'
import { useRegion } from '@/context/RegionContext'
import { loadAllEmployees, loadAllBranches } from '@/lib/regionHelpers'

function r2(n: number) { return Math.round(n * 100) / 100 }

function uid() {
  return `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to   + 'T00:00:00')
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1)
}

export type SickLeaveInput = {
  employeeId: string
  branchId:   string
  fromDate:   string
  toDate:     string
  days:       number
  note:       string
}

export interface SickLeaveSummary {
  employee:        Employee
  currentBranchId: string | null
  totalDaysUsed:   number
  recordsCount:    number
}

export interface SickLeaveKPI {
  totalEmployees:  number
  totalDaysUsed:   number
  employeesUsed:   number
}

export function useSickLeave() {
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

  const [records, setRecords] = useState<SickLeaveRecord[]>(() => {
    const raw = storage.get<SickLeaveRecord[] | null>('sl-records', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(r => r.id))
      const missing = SICK_LEAVE_INITIAL.filter(s => !existingIds.has(s.id))
      return [...raw, ...missing]
    }
    return [...SICK_LEAVE_INITIAL]
  })

  useEffect(() => { storage.set('sl-records', records) }, [records])

  const addRecord = useCallback((input: SickLeaveInput) => {
    const days = input.days > 0 ? input.days : daysBetween(input.fromDate, input.toDate)
    setRecords(prev => [{ id: uid(), ...input, days, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: SickLeaveInput) => {
    const days = input.days > 0 ? input.days : daysBetween(input.fromDate, input.toDate)
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...input, days } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const resetRecords = useCallback(() => setRecords([]), [])

  const year = new Date().getFullYear().toString()
  const currentYearRecords = useMemo(
    () => records.filter(r => r.fromDate.startsWith(year)),
    [records, year],
  )

  const summaries = useMemo((): SickLeaveSummary[] =>
    employees.map(emp => {
      const empRecs = currentYearRecords.filter(r => r.employeeId === emp.id)
      return {
        employee:        emp,
        currentBranchId: getCurrentBranchId(emp.id),
        totalDaysUsed:   r2(empRecs.reduce((s, r) => s + r.days, 0)),
        recordsCount:    empRecs.length,
      }
    }),
    [employees, currentYearRecords],
  )

  const kpi = useMemo((): SickLeaveKPI => ({
    totalEmployees: employees.length,
    totalDaysUsed:  r2(summaries.reduce((s, e) => s + e.totalDaysUsed, 0)),
    employeesUsed:  summaries.filter(s => s.recordsCount > 0).length,
  }), [employees, summaries])

  return {
    employees, branches, records, currentYearRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
    daysBetween,
  }
}
