const PREFIX = 'we-ts-'
const STORAGE_VERSION = '2'
const VERSION_KEY = 'we-ts-version'

// Force-clear all keys when storage schema changes (e.g. after removing br-09)
;(() => {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(VERSION_KEY) !== STORAGE_VERSION) {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) toRemove.push(k)
    }
    toRemove.forEach(k => localStorage.removeItem(k))
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION)
  }
})()

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // storage full or unavailable — silent fail
    }
  },

  remove(key: string): void {
    localStorage.removeItem(PREFIX + key)
  },

  clearAll(): void {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) toRemove.push(k)
    }
    toRemove.forEach(k => localStorage.removeItem(k))
  },
}
