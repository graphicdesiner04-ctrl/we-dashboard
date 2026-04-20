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

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const raw = storage.get<Employee[] | null>('employees', null)
    if (raw !== null && Array.isArray(raw)) {
      const existingIds = new Set(raw.map(e => e.id))
      const missing = ALL_EMPLOYEES.filter(e => !existingIds.has(e.id))
      return missing.length > 0 ? [...raw, ...missing] : raw
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
