import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, PermissionRecord, EmployeeSummary, PermissionsKPI } from '@/types/hr'
import { MONTHLY_LIMIT_HOURS } from '@/types/hr'
import { PERMISSION_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/hooks/useAssignments'
import { storage } from '@/lib/storage'
import { useRegion } from '@/context/RegionContext'
import { loadAllEmployees, loadAllBranches } from '@/lib/regionHelpers'

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
  fromTime?: string
  toTime?: string
  hours: number
  minutes: number
  note: string
}

export function usePermissions() {
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

  // empIds for region isolation — used to filter exposed records
  const empIds = useMemo(() => new Set(employees.map(e => e.id)), [employees])

  // Internal state — holds ALL records from storage (both regions)
  const [_allRecords, _setAllRecords] = useState<PermissionRecord[]>(() => {
    const raw = storage.get<PermissionRecord[] | null>('records', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(r => r.id))
      const tombstoned = storage.tombstoneGet('records')
      const missing = PERMISSION_INITIAL.filter(s => !existingIds.has(s.id) && !tombstoned.has(s.id))
      return [...raw, ...missing]
    }
    return [...PERMISSION_INITIAL]
  })

  useEffect(() => { storage.set('records', _allRecords) }, [_allRecords])

  // Region-isolated records — only current region's employees
  const records = useMemo(
    () => _allRecords.filter(r => empIds.has(r.employeeId)),
    [_allRecords, empIds],
  )

  const addRecord = useCallback((input: PermissionInput) => {
    const decimalHours = r2(input.hours + input.minutes / 60)
    _setAllRecords(prev => [{ id: uid(), ...input, decimalHours, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: PermissionInput) => {
    const decimalHours = r2(input.hours + input.minutes / 60)
    _setAllRecords(prev => prev.map(r => r.id === id ? { ...r, ...input, decimalHours } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    storage.tombstoneAdd('records', id)
    _setAllRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const resetRecords = useCallback(() => {
    // Only reset current region's records
    _setAllRecords(prev => prev.filter(r => !empIds.has(r.employeeId)))
  }, [empIds])

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
    const totalUsed = r2(summaries.reduce((s, e) => s + e.totalDecimalHours, 0))
    return {
      totalEmployees: employees.length,
      totalUsedHours: totalUsed,
      totalRemainingHours: r2(Math.max(0, employees.length * MONTHLY_LIMIT_HOURS - totalUsed)),
      employeesOverLimit: summaries.filter(s => s.isOverLimit).length,
    }
  }, [employees, summaries])

  return {
    employees, branches, records, currentMonthRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
  }
}
