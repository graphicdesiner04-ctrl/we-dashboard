import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, AnnualLeaveRecord, AnnualLeaveSummary, AnnualLeaveKPI } from '@/types/hr'
import { ANNUAL_LEAVE_DAYS } from '@/types/hr'
import { EMPLOYEES, BRANCHES, ANNUAL_LEAVE_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/hooks/useAssignments'
import { storage } from '@/lib/storage'

function r2(n: number) { return Math.round(n * 100) / 100 }

function uid() {
  return `al-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type AnnualLeaveInput = {
  employeeId: string
  branchId: string
  date: string
  days: number
  note: string
}

export function useAnnualLeave() {
  // Dynamic — reads from localStorage so changes from EmployeesPage / BranchesPage are picked up
  const [employees] = useState<Employee[]>(
    () => storage.get<Employee[]>('employees', EMPLOYEES),
  )
  const [branches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES),
  )

  // Seeded with real records from the Google Sheet
  const [records, setRecords] = useState<AnnualLeaveRecord[]>(
    () => storage.get<AnnualLeaveRecord[]>('al-records', ANNUAL_LEAVE_INITIAL),
  )

  useEffect(() => { storage.set('al-records', records) }, [records])

  const addRecord = useCallback((input: AnnualLeaveInput) => {
    setRecords(prev => [{ id: uid(), ...input, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: AnnualLeaveInput) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const resetRecords = useCallback(() => setRecords([]), [])

  const year = new Date().getFullYear().toString()
  const currentYearRecords = useMemo(
    () => records.filter(r => r.date.startsWith(year)),
    [records, year],
  )

  const summaries = useMemo((): AnnualLeaveSummary[] =>
    employees.map(emp => {
      const empRecs = currentYearRecords.filter(r => r.employeeId === emp.id)
      const total   = r2(empRecs.reduce((s, r) => s + r.days, 0))
      return {
        employee: emp,
        currentBranchId: getCurrentBranchId(emp.id),
        totalDaysUsed: total,
        remainingDays: r2(Math.max(0, ANNUAL_LEAVE_DAYS - total)),
        isOverLimit: total > ANNUAL_LEAVE_DAYS,
        recordsCount: empRecs.length,
      }
    }),
    [employees, currentYearRecords],
  )

  const kpi = useMemo((): AnnualLeaveKPI => {
    const totalUsed = r2(currentYearRecords.reduce((s, r) => s + r.days, 0))
    return {
      totalEmployees: employees.length,
      totalDaysUsed: totalUsed,
      totalRemainingDays: r2(Math.max(0, employees.length * ANNUAL_LEAVE_DAYS - totalUsed)),
      employeesOverLimit: summaries.filter(s => s.isOverLimit).length,
    }
  }, [employees, currentYearRecords, summaries])

  return {
    employees, branches, records, currentYearRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
  }
}
