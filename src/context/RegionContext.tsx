// ── WE Technical Support Dashboard — Region Context ──────────────────────
// Provides a global South / North Menia toggle.
import {
  createContext, useContext, useState, useCallback,
  type ReactNode,
} from 'react'
import type { Region } from '@/types/hr'
import { storage } from '@/lib/storage'

interface RegionContextValue {
  region:       Region
  setRegion:    (r: Region) => void
  toggleRegion: () => void
}

const RegionContext = createContext<RegionContextValue | null>(null)

const REGION_KEY = 'selected-region'

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<Region>(
    () => storage.get<Region>(REGION_KEY, 'south'),
  )

  const setRegion = useCallback((r: Region) => {
    setRegionState(r)
    storage.set(REGION_KEY, r)
  }, [])

  const toggleRegion = useCallback(() => {
    setRegion(region === 'south' ? 'north' : 'south')
  }, [region, setRegion])

  return (
    <RegionContext.Provider value={{ region, setRegion, toggleRegion }}>
      {children}
    </RegionContext.Provider>
  )
}

export function useRegion() {
  const ctx = useContext(RegionContext)
  if (!ctx) throw new Error('useRegion must be used inside <RegionProvider>')
  return ctx
}
