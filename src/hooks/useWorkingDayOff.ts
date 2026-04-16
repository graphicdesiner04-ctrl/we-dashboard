import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, WorkingDayOffRecord } from '@/types/hr'
import { EMPLOYEES, BRANCHES, WORKING_DAY_OFF_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/hooks/useAssignments'
import { storage } from '@/lib/storage'

function uid() {
  return `wd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type WorkingDayOffInput = {
  employeeId: string
  branchId:   string
  date:       string   // YYYY-MM-DD
  note:       string
}

export interface WorkingDayOffSummary {
  employee:        Employee
  currentBranchId: string | null
  daysCount:       number
}

export interface WorkingDayOffKPI {
  totalRecords:  number
  uniqueWorkers: number
}

export function useWorkingDayOff() {
  const [employees] = useState<Employee[]>(
    () => storage.get<Employee[]>('employees', EMPLOYEES),
  )
  const [branches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES),
  )

  const [records, setRecords] = useState<WorkingDayOffRecord[]>(
    () => storage.get<WorkingDayOffRecord[]>('wd-records', WORKING_DAY_OFF_INITIAL),
  )

  useEffect(() => { storage.set('wd-records', records) }, [records])

  const addRecord = useCallback((input: WorkingDayOffInput) => {
    setRecords(prev => [{ id: uid(), ...input, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: WorkingDayOffInput) => {
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

  const summaries = useMemo((): WorkingDayOffSummary[] =>
    employees.map(emp => ({
      employee:        emp,
      currentBranchId: getCurrentBranchId(emp.id),
      daysCount:       currentYearRecords.filter(r => r.employeeId === emp.id).length,
    })),
    [employees, currentYearRecords],
  )

  const kpi = useMemo((): WorkingDayOffKPI => ({
    totalRecords:  currentYearRecords.length,
    uniqueWorkers: new Set(currentYearRecords.map(r => r.employeeId)).size,
  }), [currentYearRecords])

  return {
    employees, branches, records, currentYearRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords,
  }
}
