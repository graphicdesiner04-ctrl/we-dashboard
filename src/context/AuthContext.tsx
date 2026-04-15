// ── WE Technical Support Dashboard — Auth Context ────────────────────────
import {
  createContext, useContext, useState, useCallback,
  type ReactNode,
} from 'react'
import type { AuthSession } from '@/types/auth'
import { AUTH_ACCOUNTS } from '@/data/seedAuth'
import { storage } from '@/lib/storage'

// ── Types ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: AuthSession | null
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

// ── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_KEY = 'auth-session'

// ── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(
    () => storage.get<AuthSession | null>(SESSION_KEY, null),
  )

  const login = useCallback((username: string, password: string): boolean => {
    const account = AUTH_ACCOUNTS.find(
      a =>
        a.username.trim().toLowerCase() === username.trim().toLowerCase() &&
        a.password === password,
    )
    if (!account) return false

    const s: AuthSession = {
      userId:   account.id,
      username: account.username,
      name:     account.name,
      role:     account.role,
      loginAt:  new Date().toISOString(),
    }
    setSession(s)
    storage.set(SESSION_KEY, s)
    return true
  }, [])

  const logout = useCallback(() => {
    setSession(null)
    storage.remove(SESSION_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ session, isAuthenticated: !!session, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
