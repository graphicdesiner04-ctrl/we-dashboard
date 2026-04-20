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

// ── One-time storage initializer ──────────────────────────────────────────
// Injects any missing seed employees / branches (e.g. after North Menia was added)
// without wiping existing user data.
;(function initializeStorage() {
  const ALL_EMPS = [...EMPLOYEES, ...NORTH_EMPLOYEES]
  const rawEmps = storage.get<{ id: string }[] | null>('employees', null)
  if (rawEmps !== null && Array.isArray(rawEmps)) {
    const existing = new Set(rawEmps.map(e => e.id))
    const missing  = ALL_EMPS.filter(e => !existing.has(e.id))
    if (missing.length > 0) storage.set('employees', [...rawEmps, ...missing])
  }

  const ALL_BRS = [...BRANCHES, ...NORTH_BRANCHES]
  const rawBrs = storage.get<{ id: string }[] | null>('branches', null)
  if (rawBrs !== null && Array.isArray(rawBrs)) {
    const existing = new Set(rawBrs.map(b => b.id))
    const missing  = ALL_BRS.filter(b => !existing.has(b.id))
    if (missing.length > 0) storage.set('branches', [...rawBrs, ...missing])
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
