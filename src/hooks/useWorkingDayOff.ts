import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, WorkingDayOffRecord } from '@/types/hr'
import { EMPLOYEES, BRANCHES } from '@/data/seedData'
import { storage } from '@/lib/storage'

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
  const [employees] = useState<Employee[]>(
    () => storage.get<Employee[]>('employees', EMPLOYEES),
  )
  const [branches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES),
  )
  const [records, setRecords] = useState<WorkingDayOffRecord[]>(
    () => storage.get<WorkingDayOffRecord[]>('wdo-records', []),
  )

  useEffect(() => { storage.set('wdo-records', records) }, [records])

  const addRecord = useCallback((input: WorkingDayOffInput) => {
    setRecords(prev => [{ id: uid(), ...input, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: WorkingDayOffInput) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

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
    kpi, addRecord, updateRecord, deleteRecord,
  }
}
