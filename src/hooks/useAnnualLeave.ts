import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, AnnualLeaveRecord, AnnualLeaveSummary, AnnualLeaveKPI } from '@/types/hr'
import { ANNUAL_LEAVE_DAYS } from '@/types/hr'
import { ANNUAL_LEAVE_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/lib/getCurrentBranch'
import { storage } from '@/lib/storage'
import { useRegion } from '@/context/RegionContext'
import { loadAllEmployees, loadAllBranches } from '@/lib/regionHelpers'
import { syncAlAdd, syncAlUpdate, syncAlRemove } from '@/lib/scheduleSync'

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
  const [_allRecords, _setAllRecords] = useState<AnnualLeaveRecord[]>(() => {
    const raw = storage.get<AnnualLeaveRecord[] | null>('al-records', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(r => r.id))
      const tombstoned = storage.tombstoneGet('al-records')
      const missing = ANNUAL_LEAVE_INITIAL.filter(s => !existingIds.has(s.id) && !tombstoned.has(s.id))
      return [...raw, ...missing]
    }
    return [...ANNUAL_LEAVE_INITIAL]
  })

  useEffect(() => { storage.set('al-records', _allRecords) }, [_allRecords])

  // Region-isolated records — only current region's employees
  const records = useMemo(
    () => _allRecords.filter(r => empIds.has(r.employeeId)),
    [_allRecords, empIds],
  )

  const addRecord = useCallback((input: AnnualLeaveInput) => {
    const id = uid()
    _setAllRecords(prev => [{ id, ...input, createdAt: new Date().toISOString() }, ...prev])
    syncAlAdd(region, id, input.employeeId, input.date, input.days, input.branchId, input.note)
  }, [region])

  const updateRecord = useCallback((id: string, input: AnnualLeaveInput) => {
    _setAllRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
    syncAlUpdate(region, id, input.employeeId, input.date, input.days, input.branchId, input.note)
  }, [region])

  const deleteRecord = useCallback((id: string) => {
    storage.tombstoneAdd('al-records', id)
    _setAllRecords(prev => prev.filter(r => r.id !== id))
    syncAlRemove(region, id)
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
    const totalUsed = r2(summaries.reduce((s, e) => s + e.totalDaysUsed, 0))
    return {
      totalEmployees: employees.length,
      totalDaysUsed: totalUsed,
      totalRemainingDays: r2(Math.max(0, employees.length * ANNUAL_LEAVE_DAYS - totalUsed)),
      employeesOverLimit: summaries.filter(s => s.isOverLimit).length,
    }
  }, [employees, summaries])

  return {
    employees, branches, records, currentYearRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
  }
}
