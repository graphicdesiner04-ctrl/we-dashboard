import { useState, useCallback, useEffect } from 'react'
import type { BranchTechnicalProfile, BranchAsset } from '@/types/hr'
import { BRANCH_TECHNICAL, BRANCH_ASSETS } from '@/data/seedData'
import { storage } from '@/lib/storage'

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type ProfileInput = Omit<BranchTechnicalProfile, 'id'>
export type AssetInput   = Omit<BranchAsset, 'id'>

export function useBranchTechnical() {
  // Profiles — seed on first visit
  const [profiles, setProfiles] = useState<BranchTechnicalProfile[]>(() => {
    const raw = storage.get<BranchTechnicalProfile[] | null>('bt-profiles', null)
    return raw ?? BRANCH_TECHNICAL
  })

  // Assets — seed on first visit
  const [assets, setAssets] = useState<BranchAsset[]>(() => {
    const raw = storage.get<BranchAsset[] | null>('bt-assets', null)
    return raw ?? BRANCH_ASSETS
  })

  useEffect(() => { storage.set('bt-profiles', profiles) }, [profiles])
  useEffect(() => { storage.set('bt-assets',   assets)   }, [assets])

  // ── Profile CRUD ──────────────────────────────────────────────────────────
  const addProfile = useCallback((input: ProfileInput) => {
    setProfiles(prev => [...prev, { id: uid('bt'), ...input }])
  }, [])

  const updateProfile = useCallback((id: string, input: ProfileInput) => {
    setProfiles(prev => prev.map(p => p.id === id ? { id, ...input } : p))
  }, [])

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id))
  }, [])

  // ── Asset CRUD ────────────────────────────────────────────────────────────
  const addAsset = useCallback((input: AssetInput) => {
    setAssets(prev => [...prev, { id: uid('ba'), ...input }])
  }, [])

  const updateAsset = useCallback((id: string, input: AssetInput) => {
    setAssets(prev => prev.map(a => a.id === id ? { id, ...input } : a))
  }, [])

  const deleteAsset = useCallback((id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  return {
    profiles, assets,
    addProfile, updateProfile, deleteProfile,
    addAsset,   updateAsset,   deleteAsset,
  }
}
