import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Employee, Branch, InsteadOfRecord } from '@/types/hr'
import { EMPLOYEES, BRANCHES, INSTEAD_OF_INITIAL } from '@/data/seedData'
import { getCurrentBranchId } from '@/hooks/useAssignments'
import { storage } from '@/lib/storage'

function uid() {
  return `io-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type InsteadOfInput = {
  employeeId:       string          // الموظف الذي اشتغل في يوم إجازته
  branchId?:        string          // الفرع (اختياري)
  date:             string          // YYYY-MM-DD — اليوم الذي اشتغل فيه
  replacementDate?: string          // YYYY-MM-DD — يوم البدل الذي أُخذ مكانه
  note:             string
}

export interface InsteadOfSummary {
  employee:          Employee
  currentBranchId:   string | null
  workedCount:       number          // أيام اشتغلها في وقت إجازته
  compensatoryGiven: number          // أيام بدل أُعطيت له
  remainingOwed:     number          // أيام لم تُعطَ بعد
}

export interface InsteadOfKPI {
  totalRecords:   number
  uniqueWorkers:  number
  totalOwed:      number   // مجموع الأيام المستحقة لم تُعطَ بعد
  totalGiven:     number   // مجموع أيام البدل التي أُعطيت
}

export function useInsteadOf() {
  const [employees] = useState<Employee[]>(
    () => storage.get<Employee[]>('employees', EMPLOYEES),
  )
  const [branches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES),
  )

  const [records, setRecords] = useState<InsteadOfRecord[]>(
    () => storage.get<InsteadOfRecord[]>('io-records', INSTEAD_OF_INITIAL),
  )

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

  const year = new Date().getFullYear().toString()
  const currentYearRecords = useMemo(
    () => records.filter(r => r.date.startsWith(year)),
    [records, year],
  )

  const summaries = useMemo((): InsteadOfSummary[] =>
    employees.map(emp => {
      const empRecs          = currentYearRecords.filter(r => r.employeeId === emp.id)
      const workedCount      = empRecs.length
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
