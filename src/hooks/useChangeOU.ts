import { useState, useCallback, useEffect } from 'react'
import type { ChangeOURecord } from '@/types/hr'
import { storage } from '@/lib/storage'

function uid() {
  return `cou-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type ChangeOUInput = Omit<ChangeOURecord, 'id' | 'createdAt'>

export function useChangeOU() {
  const [records, setRecords] = useState<ChangeOURecord[]>(() =>
    storage.get<ChangeOURecord[]>('change-ou-records', [])
  )
  useEffect(() => { storage.set('change-ou-records', records) }, [records])

  const addRecord = useCallback((input: ChangeOUInput) => {
    setRecords(prev => [...prev, { id: uid(), ...input, createdAt: new Date().toISOString() }])
  }, [])

  const updateRecord = useCallback((id: string, input: ChangeOUInput) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...input } : r))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }, [])

  return { records, addRecord, updateRecord, deleteRecord }
}
