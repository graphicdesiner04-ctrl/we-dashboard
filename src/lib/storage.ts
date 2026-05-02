const PREFIX = 'we-ts-'
// NOTE: Do NOT add auto-clear logic here.
// Changing a version number used to wipe all user data (schedules, configs, etc.)
// on every new deployment. Data is stored in the user's browser localStorage and
// must NEVER be erased by a deployment. If a schema migration is ever needed,
// write a targeted migration that transforms data — never a blanket wipe.

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

  // ── Tombstone — tracks IDs the user explicitly deleted ──────────────────
  // Prevents seed-data merging from restoring records the user removed.
  // Each namespace (storage key) has its own deleted-IDs list.
  tombstoneGet(namespace: string): Set<string> {
    return new Set(this.get<string[]>(`${namespace}:deleted`, []))
  },

  tombstoneAdd(namespace: string, id: string): void {
    const current = this.get<string[]>(`${namespace}:deleted`, [])
    if (!current.includes(id)) {
      this.set(`${namespace}:deleted`, [...current, id])
    }
  },
}
