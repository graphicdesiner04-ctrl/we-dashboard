import { useState, useMemo } from 'react'
import {
  GitBranch, Plus, Pencil, Trash2, X, Save, Search,
  Users, Calendar, ChevronLeft, ChevronRight, Building2,
} from 'lucide-react'
import { useBranches }  from '@/hooks/useBranches'
import { useEmployees } from '@/hooks/useEmployees'
import { useSchedule }  from '@/hooks/useSchedule'
import { getEmpName }   from '@/data/seedData'
import { useRegion }    from '@/context/RegionContext'
import type { Branch }  from '@/types/hr'
import type { BranchInput } from '@/hooks/useBranches'

const WE = '#6B21A8'

// ── Helpers ───────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDateDisplay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const SHIFT_LABELS: Record<string, string> = {
  branch:  'On Duty',
  visit:   'Visit',
  swap:    'Swap',
  off:     'Day Off',
  annual:  'Annual Leave',
  sick:    'Sick Leave',
  note:    'Note',
  empty:   '—',
}

const ACTIVE_TYPES = new Set(['branch', 'visit', 'swap'])

// ── Branch Modal ──────────────────────────────────────────────────────────
const EMPTY_BRANCH: BranchInput = {
  ou: '', storeName: '', storeNameAr: '',
  ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '',
}

function BranchModal({
  editing, onClose, onSave, onDelete, region,
}: {
  editing:   Branch | null
  onClose:   () => void
  onSave:    (input: BranchInput & { region?: 'south' | 'north' }) => void
  onDelete?: () => void
  region:    'south' | 'north'
}) {
  const [form, setForm] = useState<BranchInput>(() =>
    editing
      ? {
          ou: editing.ou, storeName: editing.storeName, storeNameAr: editing.storeNameAr ?? '',
          ext1: editing.ext1, ext2: editing.ext2, ext3: editing.ext3,
          extSenior: editing.extSenior, test1: editing.test1, test2: editing.test2,
        }
      : EMPTY_BRANCH,
  )
  const set = (k: keyof BranchInput, v: string) => setForm(f => ({ ...f, [k]: v }))
  const L = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-bold text-secondary mb-1">{children}</label>
  )
  const Inp = ({ k, placeholder }: { k: keyof BranchInput; placeholder?: string }) => (
    <input value={String(form[k] ?? '')} onChange={e => set(k, e.target.value)}
      placeholder={placeholder} className="we-input text-xs w-full" />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
              <Building2 size={14} style={{ color: WE }} />
            </div>
            <h2 className="text-sm font-black text-primary">{editing ? 'Edit Branch' : 'Add New Branch'}</h2>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><L>Branch Name (English) *</L><Inp k="storeName" placeholder="Mallawy" /></div>
            <div className="col-span-2"><L>Branch Name (Arabic)</L><Inp k="storeNameAr" placeholder="ملوى" /></div>
            <div className="col-span-2"><L>OU Code</L><Inp k="ou" placeholder="wS09Bi010921" /></div>
            <div><L>EXT 1</L><Inp k="ext1" placeholder="9070" /></div>
            <div><L>EXT 2</L><Inp k="ext2" placeholder="9071" /></div>
            <div><L>EXT 3</L><Inp k="ext3" placeholder="9072" /></div>
            <div><L>EXT Senior</L><Inp k="extSenior" placeholder="9073" /></div>
            <div><L>Test 1</L><Inp k="test1" placeholder="9920" /></div>
            <div><L>Test 2</L><Inp k="test2" placeholder="9921" /></div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => {
              if (!form.storeName.trim()) { alert('Branch name is required'); return }
              onSave({ ...form, region })
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            {editing ? <><Save size={14} /> Save</> : <><Plus size={14} /> Add Branch</>}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Branch card ───────────────────────────────────────────────────────────
function BranchCard({
  branch, dailyStaff, onEdit,
}: {
  branch:     Branch
  dailyStaff: { empName: string; empCode: string; role: string; shift: string; startTime?: string; endTime?: string; note: string }[]
  onEdit:     () => void
}) {
  return (
    <div className="card overflow-hidden" style={{ borderLeft: `4px solid ${WE}` }}>
      {/* Branch header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            {branch.storeName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-primary text-sm">{branch.storeName}</p>
            <p className="text-[10px] font-mono text-tertiary">{branch.ou}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: `${WE}12`, color: WE }}>
            <Users size={9} /> {dailyStaff.length}
          </span>
          <button onClick={onEdit}
            className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors">
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Daily staff table */}
      {dailyStaff.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs text-tertiary">No staff scheduled for this date</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="we-table w-full min-w-[460px]">
            <thead>
              <tr>
                <th className="text-left">Employee</th>
                <th className="text-left">ID</th>
                <th className="text-left">Role</th>
                <th className="text-left">Shift</th>
                <th className="text-left">Time</th>
                <th className="text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {dailyStaff.map((s, i) => (
                <tr key={i}>
                  <td><span className="text-xs font-semibold text-primary">{s.empName}</span></td>
                  <td><span className="text-xs font-mono font-bold" style={{ color: WE }}>{s.empCode}</span></td>
                  <td><span className="text-[10px] text-secondary">{s.role}</span></td>
                  <td>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${WE}12`, color: WE }}>
                      {s.shift}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-mono text-secondary num">
                      {s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : '—'}
                    </span>
                  </td>
                  <td><span className="text-[10px] text-tertiary">{s.note || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function BranchesPage() {
  const { region } = useRegion()
  const { branches: allBranches, addBranch, updateBranch, deleteBranch } = useBranches()
  const { employees: allEmployees } = useEmployees()
  const { entries } = useSchedule(region)

  const branches = useMemo(
    () => allBranches.filter(b => (b.region ?? 'south') === region),
    [allBranches, region],
  )

  const employees = useMemo(
    () => allEmployees.filter(e => (e.region ?? 'south') === region),
    [allEmployees, region],
  )

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [search, setSearch]             = useState('')
  const [branchModal, setBranchModal]   = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  // Employees map for fast lookup
  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees])

  // Entries for selected date — only active types
  const dayEntries = useMemo(
    () => entries.filter(e => e.date === selectedDate && ACTIVE_TYPES.has(e.cellType ?? 'branch')),
    [entries, selectedDate],
  )

  // Build daily staff per branch
  const dailyStaffByBranch = useMemo(() => {
    const map = new Map<string, typeof dayEntries>()
    dayEntries.forEach(entry => {
      if (!entry.branchId) return
      if (!map.has(entry.branchId)) map.set(entry.branchId, [])
      map.get(entry.branchId)!.push(entry)
    })
    return map
  }, [dayEntries])

  // Filtered branches by search
  const filteredBranches = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return branches
    return branches.filter(b =>
      b.storeName.toLowerCase().includes(q) ||
      (b.storeNameAr ?? '').includes(q) ||
      b.ou.toLowerCase().includes(q),
    )
  }, [branches, search])

  // Total active staff today
  const totalStaff = dayEntries.length

  // Date nav
  function changeDate(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  function handleBranchSave(input: BranchInput & { region?: 'south' | 'north' }) {
    if (editingBranch) updateBranch(editingBranch.id, input)
    else               addBranch({ ...input, region })
    setBranchModal(false); setEditingBranch(null)
  }

  function handleBranchDelete() {
    if (!editingBranch) return
    if (window.confirm(`Delete branch "${editingBranch.storeName}" permanently?`)) {
      deleteBranch(editingBranch.id)
      setBranchModal(false); setEditingBranch(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${WE}14` }}>
              <GitBranch size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">Branches & Daily Staff</h1>
          </div>
          <p className="text-sm text-secondary">
            {branches.length} branches · {totalStaff} staff on duty · {fmtDateDisplay(selectedDate)}
          </p>
        </div>
        <button
          onClick={() => { setEditingBranch(null); setBranchModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Plus size={14} /> Add Branch
        </button>
      </div>

      {/* Toolbar */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => changeDate(-1)}
            className="p-1.5 rounded-lg hover:bg-elevated transition-colors text-tertiary hover:text-primary">
            <ChevronLeft size={15} />
          </button>
          <div className="flex items-center gap-2 px-2">
            <Calendar size={13} style={{ color: WE }} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="we-input text-xs w-36 num"
            />
          </div>
          <button onClick={() => changeDate(1)}
            className="p-1.5 rounded-lg hover:bg-elevated transition-colors text-tertiary hover:text-primary">
            <ChevronRight size={15} />
          </button>
          {selectedDate !== todayStr() && (
            <button onClick={() => setSelectedDate(todayStr())}
              className="text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
              style={{ background: `${WE}14`, color: WE }}>
              Today
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={12} className="absolute top-1/2 -translate-y-1/2 left-3 text-tertiary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search branches..."
            className="we-input pl-8 text-xs w-full"
          />
        </div>
      </div>

      {/* Branch cards with daily staff */}
      {filteredBranches.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-3 text-center">
          <GitBranch size={36} className="text-tertiary" strokeWidth={1.3} />
          <p className="text-secondary font-semibold text-sm">
            {search ? 'No branches match your search' : 'No branches found for this region'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBranches.map(branch => {
            const branchEntries = dailyStaffByBranch.get(branch.id) ?? []

            const dailyStaff = branchEntries.map(entry => {
              const emp = empMap.get(entry.employeeId)
              return {
                empName:   emp ? getEmpName(emp) : entry.employeeId,
                empCode:   emp?.employeeCode ?? '—',
                role:      emp?.role ?? '—',
                shift:     SHIFT_LABELS[entry.cellType] ?? entry.cellType,
                startTime: entry.startTime,
                endTime:   entry.endTime,
                note:      entry.note ?? '',
              }
            }).sort((a, b) => {
              // Supervisors first, then Seniors, then Agents
              const order = { Supervisor: 0, Senior: 1, Agent: 2 }
              return (order[a.role as keyof typeof order] ?? 9) - (order[b.role as keyof typeof order] ?? 9)
            })

            return (
              <BranchCard
                key={branch.id}
                branch={branch}
                dailyStaff={dailyStaff}
                onEdit={() => { setEditingBranch(branch); setBranchModal(true) }}
              />
            )
          })}
        </div>
      )}

      {/* Branch modal */}
      {branchModal && (
        <BranchModal
          editing={editingBranch}
          region={region as 'south' | 'north'}
          onClose={() => { setBranchModal(false); setEditingBranch(null) }}
          onSave={handleBranchSave}
          onDelete={editingBranch ? handleBranchDelete : undefined}
        />
      )}
    </div>
  )
}
