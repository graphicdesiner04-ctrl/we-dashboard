// ── WE Technical Support Dashboard — Auth Seed ───────────────────────────
// Development seed: plaintext passwords.
// Production: replace password field with bcrypt hash and verify server-side.

import type { UserAccount } from '@/types/auth'

export const AUTH_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-01',
    name: 'Ahmed Galal',
    role: 'Senior',
    username: 'Ahmed.G.Hafez',
    password: 'WeData2060',
    employeeId: 'emp-13',
  },
  {
    id: 'usr-02',
    name: 'Mohamed Hisham',
    role: 'Senior',
    username: 'Mohamed.Hisham',
    password: 'WeData2060',
    employeeId: 'emp-14',
  },
  {
    id: 'usr-03',
    name: 'Ahmed Hassan',
    role: 'Senior',
    username: 'Ahmed.H.Bahaa',
    password: 'WeData2060',
    employeeId: 'emp-15',
  },
  {
    id: 'usr-04',
    name: 'Ali Mahrous',
    role: 'Senior',
    username: 'Ali.Mahrous',
    password: 'WeData2060',
    employeeId: 'emp-16',
  },
  {
    id: 'usr-05',
    name: 'Ahmed Alaa',
    role: 'Senior',
    username: 'Ahmed.Eldin',
    password: 'WeData2060',
    employeeId: 'emp-17',
  },
  {
    id: 'usr-06',
    name: 'Mohamed Sholkamy',
    role: 'Super',
    username: 'Mohamed.M.Sholkamy',
    password: 'WeData2060',
    employeeId: 'emp-42',
  },

  // ── North Seniors ─────────────────────────────────────────────────────────
  {
    id: 'usr-n01',
    name: 'Anas Wael',
    role: 'Senior',
    username: 'Anas.Wael',
    password: 'WeData2060',
    employeeId: 'emp-n21',
  },
  {
    id: 'usr-n02',
    name: 'Mahmoud Nour-Eldeen',
    role: 'Senior',
    username: 'Mahmoud.NourEldeen',
    password: 'WeData2060',
    employeeId: 'emp-n22',
  },
  {
    id: 'usr-n03',
    name: 'Amr Salah',
    role: 'Senior',
    username: 'Amr.Salah',
    password: 'WeData2060',
    employeeId: 'emp-n23',
  },
  {
    id: 'usr-n04',
    name: 'Mohamed Shalkamy',
    role: 'Senior',
    username: 'Mohamed.Shalkamy',
    password: 'WeData2060',
    employeeId: 'emp-n24',
  },
  {
    id: 'usr-n05',
    name: 'Bishoy Megeed',
    role: 'Senior',
    username: 'Bishoy.Megeed',
    password: 'WeData2060',
    employeeId: 'emp-n25',
  },
]
