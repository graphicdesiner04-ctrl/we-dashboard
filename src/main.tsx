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
// Runs once at startup.
// • South employees/branches: preserved from localStorage; missing ones injected.
// • North employees/branches: ALWAYS replaced with latest seed data.
//   (Domain names and OU codes may have been corrected in the seed — force refresh.)
;(function initializeStorage() {
  const northEmpIds = new Set(NORTH_EMPLOYEES.map(e => e.id))
  const northBrIds  = new Set(NORTH_BRANCHES.map(b => b.id))

  // ── Employees ────────────────────────────────────────────────────────────
  const rawEmps = storage.get<{ id: string }[] | null>('employees', null)
  if (rawEmps !== null && Array.isArray(rawEmps)) {
    // Keep only South employees from storage (user may have edited them)
    const southOnly = rawEmps.filter(e => !northEmpIds.has(e.id))
    // Inject any missing South seed employees
    const existingSouth = new Set(southOnly.map(e => e.id))
    const missingSouth  = EMPLOYEES.filter(e => !existingSouth.has(e.id))
    // Always use latest North seed data
    storage.set('employees', [...southOnly, ...missingSouth, ...NORTH_EMPLOYEES])
  } else if (rawEmps === null) {
    // First run — write full combined seed
    storage.set('employees', [...EMPLOYEES, ...NORTH_EMPLOYEES])
  }

  // ── Branches ─────────────────────────────────────────────────────────────
  const rawBrs = storage.get<{ id: string }[] | null>('branches', null)
  if (rawBrs !== null && Array.isArray(rawBrs)) {
    const southOnly = rawBrs.filter(b => !northBrIds.has(b.id))
    const existingSouth = new Set(southOnly.map(b => b.id))
    const missingSouth  = BRANCHES.filter(b => !existingSouth.has(b.id))
    storage.set('branches', [...southOnly, ...missingSouth, ...NORTH_BRANCHES])
  } else if (rawBrs === null) {
    storage.set('branches', [...BRANCHES, ...NORTH_BRANCHES])
  }
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
