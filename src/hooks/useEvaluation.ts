import { useState, useCallback, useMemo, useEffect } from 'react'
import { EMPLOYEES, BRANCHES } from '@/data/seedData'
import { storage } from '@/lib/storage'
import type { Employee, Branch } from '@/types/hr'

export type EvaluationRecord = {
  id:         string
  employeeId: string
  note:       string
  score:      1 | -1      // +1 إيجابي / -1 سلبي
  date:       string      // YYYY-MM-DD
  branchId?:  string
  createdAt:  string
}

export type EvaluationInput = Omit<EvaluationRecord, 'id' | 'createdAt'>

export type EmployeeEvalSummary = {
  employee:      Employee
  totalPositive: number
  totalNegative: number
  netScore:      number
  records:       EvaluationRecord[]
}

function uid() {
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function useEvaluation() {
  const [employees] = useState<Employee[]>(
    () => storage.get<Employee[]>('employees', EMPLOYEES),
  )
  const [branches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES.filter(b => b.id !== 'br-09')),
  )

  const [records, setRecords] = useState<EvaluationRecord[]>(
    () => storage.get<EvaluationRecord[]>('eval-records', []),
  )

  useEffect(() => { storage.set('eval-records', records) }, [records])

  const addRecord = useCallback((input: EvaluationInput) => {
    setRecords(prev => [{ id: uid(), ...input, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: EvaluationInput) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const year  = new Date().getFullYear().toString()
  const month = new Date().toISOString().slice(0, 7)  // YYYY-MM

  const currentYearRecords = useMemo(
    () => records.filter(r => r.date.startsWith(year)),
    [records, year],
  )

  const currentMonthRecords = useMemo(
    () => records.filter(r => r.date.startsWith(month)),
    [records, month],
  )

  // Per-employee summary (current year)
  const summaries = useMemo((): EmployeeEvalSummary[] =>
    employees
      .map(emp => {
        const empRecs = currentYearRecords.filter(r => r.employeeId === emp.id)
        return {
          employee:      emp,
          totalPositive: empRecs.filter(r => r.score === 1).length,
          totalNegative: empRecs.filter(r => r.score === -1).length,
          netScore:      empRecs.reduce((s, r) => s + r.score, 0),
          records:       empRecs,
        }
      })
      .filter(s => s.records.length > 0)
      .sort((a, b) => b.netScore - a.netScore),
  [employees, currentYearRecords])

  const kpi = useMemo(() => ({
    totalRecords:   currentYearRecords.length,
    totalPositive:  currentYearRecords.filter(r => r.score === 1).length,
    totalNegative:  currentYearRecords.filter(r => r.score === -1).length,
    uniqueEmployees: new Set(currentYearRecords.map(r => r.employeeId)).size,
    monthPositive:  currentMonthRecords.filter(r => r.score === 1).length,
    monthNegative:  currentMonthRecords.filter(r => r.score === -1).length,
  }), [currentYearRecords, currentMonthRecords])

  return {
    employees, branches, records, currentYearRecords, currentMonthRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord,
  }
}
