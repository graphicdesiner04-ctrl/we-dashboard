import { useState, useCallback, useEffect } from 'react'
import type { Employee, EmployeeRole } from '@/types/hr'
import { EMPLOYEES, NORTH_EMPLOYEES } from '@/data/seedData'
import { storage } from '@/lib/storage'

const ALL_EMPLOYEES = [...EMPLOYEES, ...NORTH_EMPLOYEES]

export type EmployeeInput = {
  domainName: string
  user: string
  name: string
  nameEn: string
  email: string
  mobile: string
  nationalId: string
  employeeCode: string
  level?: number
  role?: EmployeeRole
  operatorAccount?: string
  dsPortalName?: string
}

function uid() {
  return `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

const NORTH_IDS   = new Set(NORTH_EMPLOYEES.map(e => e.id))
const RESIGNED_IDS = new Set(['emp-40']) // resigned 2026-04-15

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const raw = storage.get<Employee[] | null>('employees', null)
    if (raw !== null && Array.isArray(raw)) {
      // Always replace north employees with latest seed data so that
      // nameEn / region fields are never stale from old localStorage.
      const southOnly     = raw.filter(e => !NORTH_IDS.has(e.id) && !RESIGNED_IDS.has(e.id))
      const existingSouth = new Set(southOnly.map(e => e.id))
      const missingSouth  = EMPLOYEES.filter(e => !existingSouth.has(e.id))
      return [...southOnly, ...missingSouth, ...NORTH_EMPLOYEES]
    }
    return [...ALL_EMPLOYEES]
  })

  useEffect(() => { storage.set('employees', employees) }, [employees])

  const addEmployee = useCallback((input: EmployeeInput) => {
    setEmployees(prev => [{ id: uid(), ...input }, ...prev])
  }, [])

  const updateEmployee = useCallback((id: string, input: Partial<EmployeeInput>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...input } : e))
  }, [])

  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
  }, [])

  return { employees, addEmployee, updateEmployee, deleteEmployee }
}
