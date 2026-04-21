import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ThemeProvider }    from '@/context/ThemeContext'
import { AuthProvider }     from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { RegionProvider }   from '@/context/RegionContext'
import { EMPLOYEES, NORTH_EMPLOYEES, BRANCHES, NORTH_BRANCHES } from '@/data/seedData'
import { storage } from '@/lib/storage'
import App from './App'
import './index.css'

// ── Storage initializer ───────────────────────────────────────────────────
// Runs once at startup. Order matters — run cleanup BEFORE rendering.
;(function initializeStorage() {
  const northEmpIds = new Set(NORTH_EMPLOYEES.map(e => e.id))
  const northBrIds  = new Set(NORTH_BRANCHES.map(b => b.id))

  // ── Employees ────────────────────────────────────────────────────────────
  // South employees preserved; North employees always replaced with latest seed.
  const rawEmps = storage.get<{ id: string }[] | null>('employees', null)
  if (rawEmps !== null && Array.isArray(rawEmps)) {
    const southOnly     = rawEmps.filter(e => !northEmpIds.has(e.id))
    const existingSouth = new Set(southOnly.map(e => e.id))
    const missingSouth  = EMPLOYEES.filter(e => !existingSouth.has(e.id))
    storage.set('employees', [...southOnly, ...missingSouth, ...NORTH_EMPLOYEES])
  } else if (rawEmps === null) {
    storage.set('employees', [...EMPLOYEES, ...NORTH_EMPLOYEES])
  }

  // ── Branches ─────────────────────────────────────────────────────────────
  const rawBrs = storage.get<{ id: string }[] | null>('branches', null)
  if (rawBrs !== null && Array.isArray(rawBrs)) {
    const southOnly     = rawBrs.filter(b => !northBrIds.has(b.id))
    const existingSouth = new Set(southOnly.map(b => b.id))
    const missingSouth  = BRANCHES.filter(b => !existingSouth.has(b.id))
    storage.set('branches', [...southOnly, ...missingSouth, ...NORTH_BRANCHES])
  } else if (rawBrs === null) {
    storage.set('branches', [...BRANCHES, ...NORTH_BRANCHES])
  }

  // ── Change-OU record cleanup ──────────────────────────────────────────────
  // Before region-isolation was complete, South employee records could
  // accidentally end up in 'north-change-ou-records' (and vice-versa).
  // Build allowlists from seed domain names and employee IDs.
  const northDomains = new Set(
    NORTH_EMPLOYEES.map(e => (e.domainName ?? e.user).toLowerCase()),
  )
  const southDomains = new Set(
    EMPLOYEES.map(e => (e.domainName ?? e.user).toLowerCase()),
  )

  // Remove South-employee records from North key
  const rawNorthCOU = storage.get<{ userAccount?: string }[] | null>('north-change-ou-records', null)
  if (rawNorthCOU !== null && Array.isArray(rawNorthCOU) && rawNorthCOU.length > 0) {
    const cleaned = rawNorthCOU.filter(r => {
      const ua = (r.userAccount ?? '').toLowerCase()
      if (!ua) return true          // keep records with no account set (manually created)
      if (southDomains.has(ua)) return false  // definitely South → remove
      return true                   // North or unknown → keep
    })
    if (cleaned.length !== rawNorthCOU.length) {
      storage.set('north-change-ou-records', cleaned)
    }
  }

  // Remove North-employee records from South key
  const rawSouthCOU = storage.get<{ userAccount?: string }[] | null>('change-ou-records', null)
  if (rawSouthCOU !== null && Array.isArray(rawSouthCOU) && rawSouthCOU.length > 0) {
    const cleaned = rawSouthCOU.filter(r => {
      const ua = (r.userAccount ?? '').toLowerCase()
      if (!ua) return true
      if (northDomains.has(ua)) return false  // definitely North → remove
      return true
    })
    if (cleaned.length !== rawSouthCOU.length) {
      storage.set('change-ou-records', cleaned)
    }
  }

  // ── Note on HR records ───────────────────────────────────────────────────
  // 'records','al-records','sl-records','io-records','wdo-records','eval-records'
  // are SHARED storage keys. The hooks filter them in-memory by empIds, so
  // no cross-region records are ever visible in the UI. No storage cleanup needed.
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <RegionProvider>
              <App />
            </RegionProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </HashRouter>
  </StrictMode>,
)
