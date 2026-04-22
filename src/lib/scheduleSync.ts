/**
 * scheduleSync — Keeps schedule-entries in sync with record-level hooks.
 *
 * Each record type uses a predictable schedule-entry ID prefix so entries
 * can be found and removed when a record is updated or deleted:
 *
 *   WDO  → sync-wdo-{id}                (1 entry, cellType: 'branch')
 *   AL   → sync-al-{id}-{dayIndex}       (N entries, cellType: 'annual')
 *   SL   → sync-sl-{id}-{dayIndex}       (N entries, cellType: 'sick')
 *   IO   → sync-io-{id}-work             (cellType: 'branch' for the worked day)
 *          sync-io-{id}-comp             (cellType: 'off'    for the compensatory day)
 *
 * All functions operate directly on localStorage so they work across
 * component boundaries without requiring shared React state.
 */

import { storage } from '@/lib/storage'
import type { ScheduleEntry, ScheduleCellType, Region } from '@/types/hr'

// ── Custom event — notifies useSchedule to refresh its React state ────────
export const SCHEDULE_SYNC_EVENT = 'we-schedule-changed'

function notify(region: Region) {
  window.dispatchEvent(
    new CustomEvent(SCHEDULE_SYNC_EVENT, { detail: { region } }),
  )
}

// ── Internal helpers ──────────────────────────────────────────────────────

function scheduleKey(region: Region) {
  return region === 'north' ? 'north-schedule-entries' : 'schedule-entries'
}

function getEntries(region: Region): ScheduleEntry[] {
  return storage.get<ScheduleEntry[]>(scheduleKey(region), [])
}

function setEntries(region: Region, entries: ScheduleEntry[]) {
  storage.set(scheduleKey(region), entries)
}

/** Remove all sync entries whose id starts with the given prefix. */
function removeBySyncPrefix(region: Region, prefix: string) {
  const entries = getEntries(region)
  const filtered = entries.filter(e => !e.id.startsWith(prefix))
  if (filtered.length !== entries.length) setEntries(region, filtered)
}

/** Build a date range starting from `start`, `count` days long. */
function dateRange(start: string, count: number): string[] {
  const base = new Date(start + 'T00:00:00')
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/** Build a date range from `from` to `to` inclusive. */
function dateRangeFromTo(from: string, to: string): string[] {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to   + 'T00:00:00')
  const days = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1)
  return dateRange(from, days)
}

function makeEntry(
  id:         string,
  employeeId: string,
  date:       string,
  cellType:   ScheduleCellType,
  branchId?:  string,
  note?:      string,
): ScheduleEntry {
  return {
    id, employeeId, date, cellType,
    branchId, note: note ?? '',
    createdAt: new Date().toISOString(),
  }
}

function upsertEntries(region: Region, newEntries: ScheduleEntry[]) {
  if (newEntries.length === 0) return
  const existing  = getEntries(region)
  const newIds    = new Set(newEntries.map(e => e.id))
  const kept      = existing.filter(e => !newIds.has(e.id))   // replace if same id
  setEntries(region, [...kept, ...newEntries])
  notify(region)
}

function removeAndNotify(region: Region, prefix: string) {
  removeBySyncPrefix(region, prefix)
  notify(region)
}

// ── Public API ────────────────────────────────────────────────────────────

// ── Working Day Off (يوم تغطية) ───────────────────────────────────────────

export function syncWdoAdd(
  region:     Region,
  recordId:   string,
  employeeId: string,
  branchId:   string,
  date:       string,
  note?:      string,
) {
  const entry = makeEntry(
    `sync-wdo-${recordId}`,
    employeeId, date, 'branch', branchId,
    note ? `تغطية — ${note}` : 'تغطية يوم إجازة',
  )
  upsertEntries(region, [entry])
}

export function syncWdoUpdate(
  region:     Region,
  recordId:   string,
  employeeId: string,
  branchId:   string,
  date:       string,
  note?:      string,
) {
  syncWdoAdd(region, recordId, employeeId, branchId, date, note)
}

export function syncWdoRemove(region: Region, recordId: string) {
  removeAndNotify(region, `sync-wdo-${recordId}`)
}

// ── Annual Leave (إجازة سنوية) ─────────────────────────────────────────────

export function syncAlAdd(
  region:     Region,
  recordId:   string,
  employeeId: string,
  startDate:  string,
  days:       number,
  branchId?:  string,
  note?:      string,
) {
  const dates   = dateRange(startDate, days)
  const entries = dates.map((date, i) =>
    makeEntry(`sync-al-${recordId}-${i}`, employeeId, date, 'annual', branchId, note),
  )
  upsertEntries(region, entries)
}

export function syncAlUpdate(
  region:     Region,
  recordId:   string,
  employeeId: string,
  startDate:  string,
  days:       number,
  branchId?:  string,
  note?:      string,
) {
  removeBySyncPrefix(region, `sync-al-${recordId}`)   // silent remove first
  syncAlAdd(region, recordId, employeeId, startDate, days, branchId, note)  // notifies
}

export function syncAlRemove(region: Region, recordId: string) {
  removeAndNotify(region, `sync-al-${recordId}`)
}

// ── Sick Leave (إجازة مرضية) ──────────────────────────────────────────────

export function syncSlAdd(
  region:     Region,
  recordId:   string,
  employeeId: string,
  fromDate:   string,
  toDate:     string,
  branchId?:  string,
  note?:      string,
) {
  const dates   = dateRangeFromTo(fromDate, toDate)
  const entries = dates.map((date, i) =>
    makeEntry(`sync-sl-${recordId}-${i}`, employeeId, date, 'sick', branchId, note),
  )
  upsertEntries(region, entries)
}

export function syncSlUpdate(
  region:     Region,
  recordId:   string,
  employeeId: string,
  fromDate:   string,
  toDate:     string,
  branchId?:  string,
  note?:      string,
) {
  removeBySyncPrefix(region, `sync-sl-${recordId}`)   // silent remove first
  syncSlAdd(region, recordId, employeeId, fromDate, toDate, branchId, note)  // notifies
}

export function syncSlRemove(region: Region, recordId: string) {
  removeAndNotify(region, `sync-sl-${recordId}`)
}

// ── Instead Of / بدلاً من ─────────────────────────────────────────────────

export function syncIoAdd(
  region:          Region,
  recordId:        string,
  employeeId:      string,
  workedDate:      string,
  branchId?:       string,
  replacementDate?: string,
  note?:           string,
) {
  const toAdd: ScheduleEntry[] = [
    makeEntry(`sync-io-${recordId}-work`, employeeId, workedDate, 'branch', branchId,
      note ? `بدلاً من — ${note}` : 'بدلاً من'),
  ]
  if (replacementDate) {
    toAdd.push(
      makeEntry(`sync-io-${recordId}-comp`, employeeId, replacementDate, 'off', undefined,
        'يوم تعويضي'),
    )
  }
  upsertEntries(region, toAdd)
}

export function syncIoUpdate(
  region:           Region,
  recordId:         string,
  employeeId:       string,
  workedDate:       string,
  branchId?:        string,
  replacementDate?: string,
  note?:            string,
) {
  removeBySyncPrefix(region, `sync-io-${recordId}`)   // silent remove first
  syncIoAdd(region, recordId, employeeId, workedDate, branchId, replacementDate, note)  // notifies
}

export function syncIoRemove(region: Region, recordId: string) {
  removeAndNotify(region, `sync-io-${recordId}`)
}
