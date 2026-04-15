import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, PermissionRecord, EmployeeSummary, PermissionsKPI } from '@/types/hr'
import { MONTHLY_LIMIT_HOURS } from '@/types/hr'
import { EMPLOYEES, BRANCHES, PERMISSION_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/hooks/useAssignments'
import { storage } from '@/lib/storage'

function r2(n: number) { return Math.round(n * 100) / 100 }

function currentMonthPrefix() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function uid() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type PermissionInput = {
  employeeId: string
  branchId: string
  date: string
  hours: number
  minutes: number
  note: string
}

export function usePermissions() {
  // Dynamic — reads from localStorage so changes from EmployeesPage / BranchesPage are picked up
  const [employees] = useState<Employee[]>(
    () => storage.get<Employee[]>('employees', EMPLOYEES),
  )
  const [branches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES),
  )

  const [records, setRecords] = useState<PermissionRecord[]>(() =>
    storage.get<PermissionRecord[]>('records', PERMISSION_INITIAL),
  )

  useEffect(() => { storage.set('records', records) }, [records])

  const addRecord = useCallback((input: PermissionInput) => {
    const decimalHours = r2(input.hours + input.minutes / 60)
    setRecords(prev => [{ id: uid(), ...input, decimalHours, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: PermissionInput) => {
    const decimalHours = r2(input.hours + input.minutes / 60)
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...input, decimalHours } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const resetRecords = useCallback(() => setRecords([]), [])

  const monthPrefix = currentMonthPrefix()
  const currentMonthRecords = useMemo(
    () => records.filter(r => r.date.startsWith(monthPrefix)),
    [records, monthPrefix],
  )

  const summaries = useMemo((): EmployeeSummary[] =>
    employees.map(emp => {
      const empRecs = currentMonthRecords.filter(r => r.employeeId === emp.id)
      const total   = r2(empRecs.reduce((s, r) => s + r.decimalHours, 0))
      return {
        employee: emp,
        currentBranchId: getCurrentBranchId(emp.id),
        totalDecimalHours: total,
        remainingHours: r2(Math.max(0, MONTHLY_LIMIT_HOURS - total)),
        isOverLimit: total > MONTHLY_LIMIT_HOURS,
        recordsCount: empRecs.length,
      }
    }),
    [employees, currentMonthRecords],
  )

  const kpi = useMemo((): PermissionsKPI => {
    const totalUsed = r2(currentMonthRecords.reduce((s, r) => s + r.decimalHours, 0))
    return {
      totalEmployees: employees.length,
      totalUsedHours: totalUsed,
      totalRemainingHours: r2(Math.max(0, employees.length * MONTHLY_LIMIT_HOURS - totalUsed)),
      employeesOverLimit: summaries.filter(s => s.isOverLimit).length,
    }
  }, [employees, currentMonthRecords, summaries])

  return {
    employees, branches, records, currentMonthRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
  }
}
