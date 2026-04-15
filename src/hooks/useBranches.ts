import { useState, useCallback, useEffect } from 'react'
import type { Branch } from '@/types/hr'
import { BRANCHES } from '@/data/seedData'
import { storage } from '@/lib/storage'

export type BranchInput = {
  ou: string
  storeName: string
  storeNameAr?: string
  ext1: string
  ext2: string
  ext3: string
  extSenior: string
  test1: string
  test2: string
}

function uid() {
  return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>(
    () => storage.get<Branch[]>('branches', BRANCHES),
  )

  useEffect(() => { storage.set('branches', branches) }, [branches])

  const addBranch = useCallback((input: BranchInput) => {
    setBranches(prev => [...prev, { id: uid(), ...input }])
  }, [])

  const updateBranch = useCallback((id: string, input: Partial<BranchInput>) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...input } : b))
  }, [])

  const deleteBranch = useCallback((id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id))
  }, [])

  return { branches, addBranch, updateBranch, deleteBranch }
}
