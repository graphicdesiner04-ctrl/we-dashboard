// ── WE Technical Support Dashboard — Auth Types ──────────────────────────

export type UserRole = 'Senior' | 'Supervisor' | 'Admin'

export interface UserAccount {
  id: string
  name: string          // display name (English)
  role: UserRole
  username: string      // domain format, e.g. Ahmed.G.Hafez
  password: string      // plaintext for dev — bcrypt hash in production
  employeeId?: string   // links to Employee record if applicable
}

export interface AuthSession {
  userId: string
  username: string
  name: string
  role: UserRole
  loginAt: string       // ISO datetime
}
