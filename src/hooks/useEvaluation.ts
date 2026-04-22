import { useState, useCallback, useMemo, useEffect } from 'react'
import { EVAL_SEED_RECORDS } from '@/data/seedData'
import { storage } from '@/lib/storage'
import type { Employee, Branch } from '@/types/hr'
import { useRegion } from '@/context/RegionContext'
import { loadAllEmployees, loadAllBranches } from '@/lib/regionHelpers'

export type EvaluationRecord = {
  id:         string
  employeeId: string
  note:       string
  score:      number
  date:       string   // YYYY-MM-DD
  branchId?:  string
  createdAt:  string
}

export type EvaluationInput = Omit<EvaluationRecord, 'id' | 'createdAt'>

export type EmployeeEvalSummary = {
  employee:           Employee
  totalPositiveDeg:   number
  totalNegativeDeg:   number
  netScore:           number
  records:            EvaluationRecord[]
}

function uid() {
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function useEvaluation() {
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
  const [_allRecords, _setAllRecords] = useState<EvaluationRecord[]>(() => {
    const raw = storage.get<EvaluationRecord[] | null>('eval-records', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(r => r.id))
      const tombstoned = storage.tombstoneGet('eval-records')
      const missing = EVAL_SEED_RECORDS.filter(s => !existingIds.has(s.id) && !tombstoned.has(s.id))
      return [...raw, ...missing]
    }
    return [...EVAL_SEED_RECORDS]
  })

  useEffect(() => { storage.set('eval-records', _allRecords) }, [_allRecords])

  // Region-isolated records — only current region's employees
  const records = useMemo(
    () => _allRecords.filter(r => empIds.has(r.employeeId)),
    [_allRecords, empIds],
  )

  const addRecord = useCallback((input: EvaluationInput) => {
    _setAllRecords(prev => [{ id: uid(), ...input, createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const updateRecord = useCallback((id: string, input: EvaluationInput) => {
    _setAllRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    storage.tombstoneAdd('eval-records', id)
    _setAllRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  const year  = new Date().getFullYear().toString()
  const month = new Date().toISOString().slice(0, 7)

  const currentYearRecords = useMemo(
    () => records.filter(r => r.date.startsWith(year)),
    [records, year],
  )

  const currentMonthRecords = useMemo(
    () => records.filter(r => r.date.startsWith(month)),
    [records, month],
  )

  const summaries = useMemo((): EmployeeEvalSummary[] =>
    employees
      .map(emp => {
        const empRecs = currentYearRecords.filter(r => r.employeeId === emp.id)
        const totalPositiveDeg = empRecs.filter(r => r.score > 0).reduce((s, r) => s + r.score, 0)
        const totalNegativeDeg = empRecs.filter(r => r.score < 0).reduce((s, r) => s + Math.abs(r.score), 0)
        return {
          employee:         emp,
          totalPositiveDeg,
          totalNegativeDeg,
          netScore:         empRecs.reduce((s, r) => s + r.score, 0),
          records:          empRecs,
        }
      })
      .filter(s => s.records.length > 0)
      .sort((a, b) => b.netScore - a.netScore),
  [employees, currentYearRecords])

  const kpi = useMemo(() => ({
    totalRecords:      currentYearRecords.length,
    totalPositiveDeg:  currentYearRecords.filter(r => r.score > 0).reduce((s, r) => s + r.score, 0),
    totalNegativeDeg:  currentYearRecords.filter(r => r.score < 0).reduce((s, r) => s + Math.abs(r.score), 0),
    uniqueEmployees:   new Set(currentYearRecords.map(r => r.employeeId)).size,
    monthPositiveDeg:  currentMonthRecords.filter(r => r.score > 0).reduce((s, r) => s + r.score, 0),
    monthNegativeDeg:  currentMonthRecords.filter(r => r.score < 0).reduce((s, r) => s + Math.abs(r.score), 0),
    monthNet:          currentMonthRecords.reduce((s, r) => s + r.score, 0),
  }), [currentYearRecords, currentMonthRecords])

  return {
    employees, branches, records, currentYearRecords, currentMonthRecords,
    summaries, kpi, addRecord, updateRecord, deleteRecord,
  }
}
