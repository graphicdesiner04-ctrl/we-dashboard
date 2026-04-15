import { useState, useMemo } from 'react'
import {
  CalendarDays, Plus, Pencil, Trash2, X, Save,
  AlertTriangle, ChevronLeft, ChevronRight, Bell,
} from 'lucide-react'
import { useSchedule }  from '@/hooks/useSchedule'
import { getEmpName }   from '@/data/seedData'
import type { ScheduleEntry } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'

const WE = '#6B21A8'

// ── Date helpers ──────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekDates(startDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
}

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function fmtDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    dow: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
    day: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
  }
}

// ── Entry Modal ───────────────────────────────────────────────────────────

function EntryModal({
  editing, employees, branches, defaultDate, onClose, onSave,
}: {
  editing:     ScheduleEntry | null
  employees:   ReturnType<typeof useSchedule>['employees']
  branches:    ReturnType<typeof useSchedule>['branches']
  defaultDate: string
  onClose:     () => void
  onSave:      (input: ScheduleInput) => void
}) {
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '')
  const [branchId,   setBranchId]   = useState(editing?.branchId   ?? '')
  const [date,       setDate]       = useState(editing?.date        ?? defaultDate)
  const [note,       setNote]       = useState(editing?.note        ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !branchId || !date) return
    onSave({ employeeId, branchId, date, note })
  }

  const isEdit = !!editing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
              {isEdit ? <Pencil size={14} style={{ color: WE }} /> : <Plus size={14} style={{ color: WE }} />}
            </div>
            <h2 className="text-sm font-black text-primary">
              {isEdit ? 'تعديل مناوبة' : 'إضافة مناوبة'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3" style={{ direction: 'rtl' }}>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الموظف <span className="text-red-500">*</span></label>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="we-input" required>
              <option value="">اختر الموظف</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{getEmpName(emp)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الفرع <span className="text-red-500">*</span></label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)} className="we-input" required>
              <option value="">اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.storeName}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">التاريخ <span className="text-red-500">*</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="we-input" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">ملاحظة</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="ملاحظات..." className="we-input" maxLength={200} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              {isEdit ? <><Save size={14} />حفظ</> : <><Plus size={14} />إضافة</>}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-elevated transition-colors"
              style={{ color: 'var(--text-secondary)' }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── OU Alert Banner ───────────────────────────────────────────────────────

function AlertBanner({
  alerts, employees, branches,
}: {
  alerts:    ReturnType<typeof useSchedule>['alerts']
  employees: ReturnType<typeof useSchedule>['employees']
  branches:  ReturnType<typeof useSchedule>['branches']
}) {
  const [open, setOpen] = useState(true)
  if (!alerts.length) return null

  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))

  return (
    <div className="mb-5 rounded-2xl overflow-hidden"
      style={{ border: '1px solid #F59E0B40', background: '#F59E0B08' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-right"
        style={{ direction: 'rtl' }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#F59E0B18' }}>
          <Bell size={14} style={{ color: '#F59E0B' }} />
        </div>
        <div className="flex-1 text-right">
          <span className="text-sm font-black" style={{ color: '#F59E0B' }}>
            {alerts.length} تنبيه تغيير OU
          </span>
          <span className="text-xs text-secondary mr-2">
            — موظفون مجدولون في فرع مختلف عن تكليفهم الحالي
          </span>
        </div>
        <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
      </button>

      {/* Items */}
      {open && (
        <div className="border-t divide-y" style={{ borderColor: '#F59E0B20', direction: 'rtl' }}>
          {alerts.map(al => {
            const emp     = empMap[al.entry.employeeId]
            const curBr   = branchMap[al.currentBranchId ?? '']
            const schBr   = branchMap[al.scheduledBranchId]
            const d       = new Date(al.entry.date + 'T00:00:00')
            const dateStr = d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
            return (
              <div key={al.entry.id} className="px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary">
                    {emp ? getEmpName(emp) : '—'}
                    <span className="font-normal text-secondary"> · {dateStr}</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    التكليف الحالي:
                    <span className="font-semibold mx-1" style={{ color: '#DC2626' }}>
                      {curBr?.storeName ?? 'بدون تكليف'}
                    </span>
                    ← مجدول في:
                    <span className="font-semibold mx-1" style={{ color: '#059669' }}>
                      {schBr?.storeName ?? '—'}
                    </span>
                    <span className="font-black" style={{ color: '#F59E0B' }}>← مطلوب تغيير OU</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Weekly Grid ───────────────────────────────────────────────────────────

function WeeklyGrid({
  weekStart, entries, employees, branches,
  onAdd, onEdit, onDelete,
}: {
  weekStart: string
  entries:   ScheduleEntry[]
  employees: ReturnType<typeof useSchedule>['employees']
  branches:  ReturnType<typeof useSchedule>['branches']
  onAdd:     (date: string) => void
  onEdit:    (e: ScheduleEntry) => void
  onDelete:  (id: string) => void
}) {
  const days      = weekDates(weekStart)
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const today     = todayStr()

  // Group entries by date
  const byDate = useMemo(() => {
    const m: Record<string, ScheduleEntry[]> = {}
    for (const d of days) m[d] = []
    for (const e of entries) {
      if (days.includes(e.date)) m[e.date] = [...(m[e.date] ?? []), e]
    }
    return m
  }, [entries, days])

  return (
    <div className="card overflow-hidden">
      {/* Desktop grid */}
      <div className="hidden md:grid" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
        {days.map(d => {
          const { dow, day } = fmtDay(d)
          const isToday = d === today
          const isPast  = d < today
          const dayEntries = byDate[d] ?? []
          return (
            <div key={d} className="flex flex-col border-l first:border-l-0 min-h-[180px]"
              style={{ borderColor: 'var(--border)' }}>
              {/* Day header */}
              <div
                className="px-2 py-2 text-center border-b"
                style={{
                  borderColor: 'var(--border)',
                  background: isToday ? `${WE}14` : isPast ? 'transparent' : 'transparent',
                }}
              >
                <p className="text-[11px] font-bold" style={{ color: isToday ? WE : 'var(--text-tertiary)' }}>{dow}</p>
                <p className="text-xs font-black" style={{ color: isToday ? WE : 'var(--text-secondary)' }}>{day}</p>
              </div>

              {/* Entries */}
              <div className="flex-1 p-1.5 space-y-1">
                {dayEntries.map(e => {
                  const emp    = empMap[e.employeeId]
                  const branch = branchMap[e.branchId]
                  return (
                    <div key={e.id}
                      className="group relative rounded-lg px-2 py-1.5 text-[11px] leading-tight"
                      style={{ background: `${WE}14`, border: `1px solid ${WE}25` }}>
                      <p className="font-bold truncate" style={{ color: WE }}>
                        {emp ? getEmpName(emp) : '—'}
                      </p>
                      <p className="text-tertiary truncate">{branch?.storeName ?? '—'}</p>
                      {/* Hover actions */}
                      <div className="absolute top-0.5 left-0.5 hidden group-hover:flex gap-0.5">
                        <button onClick={() => onEdit(e)}
                          className="p-0.5 rounded bg-surface text-tertiary hover:text-purple-400">
                          <Pencil size={10} />
                        </button>
                        <button onClick={() => onDelete(e.id)}
                          className="p-0.5 rounded bg-surface text-tertiary hover:text-red-400">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {/* Add button */}
                {!isPast && (
                  <button onClick={() => onAdd(d)}
                    className="w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] text-tertiary hover:text-purple-400 hover:bg-purple-500/8 transition-colors">
                    <Plus size={11} /> إضافة
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: stacked days */}
      <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)', direction: 'rtl' }}>
        {days.map(d => {
          const { dow, day } = fmtDay(d)
          const isToday      = d === today
          const isPast       = d < today
          const dayEntries   = byDate[d] ?? []
          return (
            <div key={d} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: isToday ? WE : 'var(--text-tertiary)' }}>{dow}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{day}</span>
                  {isToday && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: WE }}>
                      اليوم
                    </span>
                  )}
                </div>
                {!isPast && (
                  <button onClick={() => onAdd(d)}
                    className="flex items-center gap-1 text-xs text-tertiary hover:text-purple-400">
                    <Plus size={12} /> إضافة
                  </button>
                )}
              </div>
              {dayEntries.length === 0 && (
                <p className="text-xs text-tertiary">لا توجد مناوبات</p>
              )}
              <div className="space-y-1.5">
                {dayEntries.map(e => {
                  const emp    = empMap[e.employeeId]
                  const branch = branchMap[e.branchId]
                  return (
                    <div key={e.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                      style={{ background: `${WE}12`, border: `1px solid ${WE}22` }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: WE }}>{emp ? getEmpName(emp) : '—'}</p>
                        <p className="text-[11px] text-tertiary truncate">{branch?.storeName ?? '—'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(e)} className="p-1 rounded text-tertiary hover:text-purple-400">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => onDelete(e.id)} className="p-1 rounded text-tertiary hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── List View ─────────────────────────────────────────────────────────────

function ListView({
  entries, employees, branches, onEdit, onDelete,
}: {
  entries:   ScheduleEntry[]
  employees: ReturnType<typeof useSchedule>['employees']
  branches:  ReturnType<typeof useSchedule>['branches']
  onEdit:    (e: ScheduleEntry) => void
  onDelete:  (id: string) => void
}) {
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))
  const today     = todayStr()

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  if (!sorted.length) return (
    <div className="card p-12 text-center">
      <CalendarDays size={38} className="text-tertiary mx-auto mb-3" strokeWidth={1.4} />
      <p className="text-secondary font-semibold text-sm">لا توجد مناوبات مسجلة</p>
    </div>
  )

  return (
    <div className="card overflow-hidden">
      <div className="table-scroll">
        <table className="we-table w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="text-right">التاريخ</th>
              <th className="text-right">الموظف</th>
              <th className="text-right">الفرع</th>
              <th className="text-right">ملاحظة</th>
              <th className="text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(e => {
              const emp    = empMap[e.employeeId]
              const branch = branchMap[e.branchId]
              const isPast = e.date < today
              return (
                <tr key={e.id} style={{ opacity: isPast ? 0.55 : 1 }}>
                  <td>
                    <span className="num text-xs font-semibold text-secondary">
                      {new Date(e.date + 'T00:00:00').toLocaleDateString('ar-EG', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                    </span>
                  </td>
                  <td><span className="font-semibold text-primary text-sm">{emp ? getEmpName(emp) : '—'}</span></td>
                  <td><span className="text-secondary text-sm">{branch?.storeName ?? '—'}</span></td>
                  <td><span className="text-tertiary text-xs">{e.note || '—'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(e)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="تعديل">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(e.id)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors" title="حذف">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { employees, branches, entries, alerts, addEntry, updateEntry, deleteEntry } =
    useSchedule()

  const today = todayStr()
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))
  const [view,      setView]      = useState<'week' | 'list'>('week')
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState<ScheduleEntry | null>(null)
  const [addDate,   setAddDate]   = useState(today)

  function openAdd(date: string) { setAddDate(date); setEditing(null); setModal(true) }
  function openEdit(e: ScheduleEntry) { setEditing(e); setModal(true) }
  function closeModal() { setModal(false); setEditing(null) }

  function handleSave(input: ScheduleInput) {
    if (editing) updateEntry(editing.id, input)
    else         addEntry(input)
    closeModal()
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذه المناوبة؟')) deleteEntry(id)
  }

  function prevWeek() { setWeekStart(w => addDays(w, -7)) }
  function nextWeek() { setWeekStart(w => addDays(w,  7)) }
  function goToday()  { setWeekStart(mondayOf(today)) }

  const weekEnd    = addDays(weekStart, 6)
  const weekLabel  = `${new Date(weekStart + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })} — ${new Date(weekEnd + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`
  const weekEntries = entries.filter(e => e.date >= weekStart && e.date <= weekEnd)

  return (
    <div style={{ direction: 'rtl' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.14)' }}>
              <CalendarDays size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">الجدول</h1>
          </div>
          <p className="text-sm text-secondary">
            جدول مناوبات الموظفين · {entries.length} مناوبة
            {alerts.length > 0 && (
              <span className="font-bold mr-2" style={{ color: '#F59E0B' }}>
                · {alerts.length} تنبيه تغيير OU
              </span>
            )}
          </p>
        </div>

        <button onClick={() => openAdd(today)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Plus size={15} /> إضافة مناوبة
        </button>
      </div>

      {/* OU Change Alerts */}
      <AlertBanner alerts={alerts} employees={employees} branches={branches} />

      {/* View tabs + week nav */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          {(['week', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={view === v
                ? { background: WE, color: '#fff' }
                : { color: 'var(--text-secondary)' }}>
              {v === 'week' ? 'أسبوعي' : 'قائمة'}
            </button>
          ))}
        </div>

        {/* Week navigation (week view only) */}
        {view === 'week' && (
          <div className="flex items-center gap-2">
            <button onClick={prevWeek}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors">
              <ChevronRight size={16} />
            </button>
            <button onClick={goToday}
              className="px-3 py-1 rounded-lg text-xs font-semibold hover:bg-elevated transition-colors"
              style={{ color: 'var(--text-secondary)' }}>
              اليوم
            </button>
            <span className="text-xs font-semibold text-secondary num">{weekLabel}</span>
            <button onClick={nextWeek}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors">
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main view */}
      {view === 'week'
        ? <WeeklyGrid
            weekStart={weekStart}
            entries={weekEntries}
            employees={employees} branches={branches}
            onAdd={openAdd} onEdit={openEdit} onDelete={handleDelete}
          />
        : <ListView
            entries={entries}
            employees={employees} branches={branches}
            onEdit={openEdit} onDelete={handleDelete}
          />
      }

      {/* Modal */}
      {modal && (
        <EntryModal
          editing={editing} employees={employees} branches={branches}
          defaultDate={addDate} onClose={closeModal} onSave={handleSave}
        />
      )}
    </div>
  )
}
