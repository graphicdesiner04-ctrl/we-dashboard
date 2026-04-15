import { useState, useMemo } from 'react'
import { GitBranch, Plus, Pencil, Trash2, X, Save, Search, Calendar } from 'lucide-react'
import { useBranches }    from '@/hooks/useBranches'
import { useAssignments } from '@/hooks/useAssignments'
import { useEmployees }   from '@/hooks/useEmployees'
import { getEmpName }     from '@/data/seedData'
import type { Branch, AssignmentHistory } from '@/types/hr'
import type { BranchInput }     from '@/hooks/useBranches'
import type { AssignmentInput } from '@/hooks/useAssignments'

const WE = '#6B21A8'

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return 'حتى الآن'
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

// ── Branch Modal ──────────────────────────────────────────────────────────

const EMPTY_BRANCH: BranchInput = {
  ou: '', storeName: '', ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '',
}

function BranchModal({
  editing, onClose, onSave,
}: {
  editing: Branch | null
  onClose: () => void
  onSave: (input: BranchInput) => void
}) {
  const [form, setForm] = useState<BranchInput>(() =>
    editing
      ? { ou: editing.ou, storeName: editing.storeName,
          ext1: editing.ext1, ext2: editing.ext2, ext3: editing.ext3,
          extSenior: editing.extSenior, test1: editing.test1, test2: editing.test2 }
      : EMPTY_BRANCH,
  )

  function set(field: keyof BranchInput, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.storeName.trim()) return
    onSave(form)
  }

  const isEdit = !!editing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${WE}16` }}>
              {isEdit ? <Pencil size={15} style={{ color: WE }} /> : <Plus size={15} style={{ color: WE }} />}
            </div>
            <h2 className="text-sm font-black text-primary">
              {isEdit ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3" style={{ direction: 'rtl' }}>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">اسم الفرع <span className="text-red-500">*</span></label>
            <input value={form.storeName} onChange={e => set('storeName', e.target.value)}
              placeholder="مثال: ملوي" className="we-input" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الوحدة التنظيمية (OU)</label>
            <input value={form.ou} onChange={e => set('ou', e.target.value)}
              placeholder="OU=Mallawy,OU=Branches" className="we-input" dir="ltr" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['ext1','ext2','ext3'] as const).map((f, i) => (
              <div key={f}>
                <label className="block text-xs font-bold text-secondary mb-1">تحويل {i+1}</label>
                <input value={form[f]} onChange={e => set(f, e.target.value)}
                  placeholder={`تحويل ${i+1}`} className="we-input" dir="ltr" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">تحويل السينيور</label>
            <input value={form.extSenior} onChange={e => set('extSenior', e.target.value)}
              placeholder="تحويل السينيور" className="we-input" dir="ltr" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['test1','test2'] as const).map((f, i) => (
              <div key={f}>
                <label className="block text-xs font-bold text-secondary mb-1">اختبار {i+1}</label>
                <input value={form[f]} onChange={e => set(f, e.target.value)}
                  placeholder={`اختبار ${i+1}`} className="we-input" dir="ltr" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />إضافة الفرع</>}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-elevated"
              style={{ color: 'var(--text-secondary)' }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Assignment Modal ──────────────────────────────────────────────────────

interface AssignmentModalProps {
  editing: AssignmentHistory | null
  branches: Branch[]
  employeeId?: string   // pre-filled when opening from employee context
  onClose: () => void
  onSave: (input: AssignmentInput) => void
}

const EMPTY_ASSIGN: AssignmentInput = {
  employeeId: '', branchId: '', fromDate: '', toDate: null, note: '',
}

function AssignmentModal({ editing, branches, employeeId, onClose, onSave }: AssignmentModalProps) {
  const { employees } = useEmployees()
  const [form, setForm] = useState<AssignmentInput>(() =>
    editing
      ? { employeeId: editing.employeeId, branchId: editing.branchId,
          fromDate: editing.fromDate, toDate: editing.toDate, note: editing.note }
      : { ...EMPTY_ASSIGN, employeeId: employeeId ?? '', fromDate: todayStr() },
  )
  const [openEnded, setOpenEnded] = useState<boolean>(editing ? editing.toDate === null : true)

  function set(field: keyof AssignmentInput, value: string | null) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employeeId || !form.branchId || !form.fromDate) return
    onSave({ ...form, toDate: openEnded ? null : form.toDate })
  }

  const isEdit = !!editing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${WE}16` }}>
              <Calendar size={15} style={{ color: WE }} />
            </div>
            <h2 className="text-sm font-black text-primary">
              {isEdit ? 'تعديل التكليف' : 'إضافة تكليف جديد'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3" style={{ direction: 'rtl' }}>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الموظف <span className="text-red-500">*</span></label>
            <select value={form.employeeId} onChange={e => set('employeeId', e.target.value)} className="we-input" required>
              <option value="">اختر الموظف</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{getEmpName(emp)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الفرع <span className="text-red-500">*</span></label>
            <select value={form.branchId} onChange={e => set('branchId', e.target.value)} className="we-input" required>
              <option value="">اختر الفرع</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.storeName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">تاريخ البداية <span className="text-red-500">*</span></label>
            <input type="date" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} className="we-input" required />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="openEnded" checked={openEnded} onChange={e => setOpenEnded(e.target.checked)}
              className="w-4 h-4 accent-purple-600" />
            <label htmlFor="openEnded" className="text-sm text-secondary cursor-pointer">تكليف مفتوح (لا تاريخ نهاية)</label>
          </div>

          {!openEnded && (
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">تاريخ النهاية</label>
              <input type="date" value={form.toDate ?? ''} onChange={e => set('toDate', e.target.value || null)} className="we-input" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">ملاحظة</label>
            <input value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="ملاحظات التكليف..." className="we-input" maxLength={200} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />إضافة التكليف</>}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-elevated"
              style={{ color: 'var(--text-secondary)' }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const { branches, addBranch, updateBranch, deleteBranch } = useBranches()
  const { assignments, addAssignment, updateAssignment, deleteAssignment } = useAssignments()
  const { employees } = useEmployees()

  const [branchModal,     setBranchModal]     = useState(false)
  const [branchEdit,      setBranchEdit]      = useState<Branch | null>(null)
  const [assignModal,     setAssignModal]     = useState(false)
  const [assignEdit,      setAssignEdit]      = useState<AssignmentHistory | null>(null)
  const [branchSearch,    setBranchSearch]    = useState('')
  const [assignSearch,    setAssignSearch]    = useState('')
  const [assignBranchFlt, setAssignBranchFlt] = useState('')
  const [activeTab,       setActiveTab]       = useState<'branches' | 'assignments'>('branches')

  const empMap    = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees])
  const branchMap = useMemo(() => Object.fromEntries(branches.map(b => [b.id, b])), [branches])

  const filteredBranches = useMemo(() => {
    const q = branchSearch.toLowerCase()
    if (!q) return branches
    return branches.filter(b => b.storeName.toLowerCase().includes(q) || b.ou.toLowerCase().includes(q))
  }, [branches, branchSearch])

  const filteredAssignments = useMemo(() => {
    const q = assignSearch.toLowerCase()
    return assignments.filter(a => {
      if (assignBranchFlt && a.branchId !== assignBranchFlt) return false
      if (!q) return true
      const emp = empMap[a.employeeId]
      return emp ? getEmpName(emp).toLowerCase().includes(q) : false
    })
  }, [assignments, assignSearch, assignBranchFlt, empMap])

  const activeAssignments = assignments.filter(a => a.toDate === null)

  // Branch modal handlers
  function openAddBranch()          { setBranchEdit(null); setBranchModal(true) }
  function openEditBranch(b: Branch) { setBranchEdit(b); setBranchModal(true) }
  function closeBranchModal()        { setBranchModal(false); setBranchEdit(null) }

  function handleBranchSave(input: BranchInput) {
    if (branchEdit) updateBranch(branchEdit.id, input)
    else            addBranch(input)
    closeBranchModal()
  }

  function handleDeleteBranch(b: Branch) {
    if (window.confirm(`هل تريد حذف الفرع "${b.storeName}"؟`)) deleteBranch(b.id)
  }

  // Assignment modal handlers
  function openAddAssign()                       { setAssignEdit(null); setAssignModal(true) }
  function openEditAssign(a: AssignmentHistory)  { setAssignEdit(a); setAssignModal(true) }
  function closeAssignModal()                     { setAssignModal(false); setAssignEdit(null) }

  function handleAssignSave(input: AssignmentInput) {
    if (assignEdit) updateAssignment(assignEdit.id, input)
    else            addAssignment(input)
    closeAssignModal()
  }

  function handleDeleteAssign(a: AssignmentHistory) {
    const emp = empMap[a.employeeId]
    const br  = branchMap[a.branchId]
    if (window.confirm(`حذف تكليف "${emp ? getEmpName(emp) : '?'}" في "${br?.storeName ?? '?'}"؟`)) {
      deleteAssignment(a.id)
    }
  }

  // KPI chips
  const chips = [
    { label: 'الفروع', value: branches.length },
    { label: 'التكليفات', value: assignments.length },
    { label: 'تكليفات نشطة', value: activeAssignments.length },
  ]

  return (
    <div style={{ direction: 'rtl' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.14)' }}>
              <GitBranch size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">الفروع والتكليفات</h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {chips.map(c => (
              <span key={c.label} className="text-xs text-secondary">
                <span className="font-black text-primary num">{c.value}</span> {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit"
        style={{ background: 'var(--bg-elevated)' }}>
        {(['branches', 'assignments'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={activeTab === tab
              ? { background: WE, color: '#fff' }
              : { color: 'var(--text-secondary)' }}>
            {tab === 'branches' ? `الفروع (${branches.length})` : `التكليفات (${assignments.length})`}
          </button>
        ))}
      </div>

      {/* ── BRANCHES TAB ── */}
      {activeTab === 'branches' && (
        <>
          <div className="card p-3 mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none" />
              <input value={branchSearch} onChange={e => setBranchSearch(e.target.value)}
                placeholder="بحث باسم الفرع أو OU..."
                className="we-input pr-8 w-full" />
            </div>
            <button onClick={openAddBranch}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              <Plus size={14} /> إضافة فرع
            </button>
          </div>

          <div className="card overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block table-scroll">
              <table className="we-table w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className="text-right">#</th>
                    <th className="text-right">اسم الفرع</th>
                    <th className="text-right">الوحدة (OU)</th>
                    <th className="text-right">تحويلات</th>
                    <th className="text-right">الموظفون النشطون</th>
                    <th className="text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBranches.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-tertiary text-sm">لا توجد فروع</td></tr>
                  )}
                  {filteredBranches.map((b, i) => {
                    const activeEmps = activeAssignments.filter(a => a.branchId === b.id).length
                    const exts = [b.ext1, b.ext2, b.ext3, b.extSenior].filter(Boolean)
                    return (
                      <tr key={b.id}>
                        <td><span className="text-tertiary text-xs num">{i + 1}</span></td>
                        <td><span className="font-semibold text-primary text-sm">{b.storeName}</span></td>
                        <td><span className="text-xs text-tertiary num">{b.ou || '—'}</span></td>
                        <td>
                          {exts.length > 0
                            ? <span className="text-xs text-secondary num">{exts.join(' · ')}</span>
                            : <span className="text-tertiary text-xs">—</span>}
                        </td>
                        <td>
                          {activeEmps > 0
                            ? <span className="badge" style={{ background: `${WE}10`, color: WE, borderColor: `${WE}25` }}>{activeEmps} موظف</span>
                            : <span className="text-tertiary text-xs">لا يوجد</span>}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditBranch(b)}
                              className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="تعديل">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDeleteBranch(b)}
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

            {/* Mobile */}
            <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {filteredBranches.length === 0 && (
                <div className="p-10 text-center text-tertiary text-sm">لا توجد فروع</div>
              )}
              {filteredBranches.map(b => {
                const activeEmps = activeAssignments.filter(a => a.branchId === b.id).length
                return (
                  <div key={b.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-primary text-sm">{b.storeName}</p>
                        {b.ou && <p className="text-xs text-tertiary num mt-0.5">{b.ou}</p>}
                      </div>
                      {activeEmps > 0 && (
                        <span className="badge flex-shrink-0" style={{ background: `${WE}10`, color: WE, borderColor: `${WE}25` }}>
                          {activeEmps} نشط
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => openEditBranch(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ color: WE, background: `${WE}12` }}>
                        <Pencil size={12} /> تعديل
                      </button>
                      <button onClick={() => handleDeleteBranch(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>
                        <Trash2 size={12} /> حذف
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── ASSIGNMENTS TAB ── */}
      {activeTab === 'assignments' && (
        <>
          <div className="card p-3 mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none" />
              <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
                placeholder="بحث باسم الموظف..." className="we-input pr-8 w-full" />
            </div>
            <select value={assignBranchFlt} onChange={e => setAssignBranchFlt(e.target.value)}
              className="we-input w-auto min-w-[140px]">
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.storeName}</option>)}
            </select>
            <button onClick={openAddAssign}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              <Plus size={14} /> إضافة تكليف
            </button>
          </div>

          <div className="card overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block table-scroll">
              <table className="we-table w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th className="text-right">الموظف</th>
                    <th className="text-right">الفرع</th>
                    <th className="text-right">من</th>
                    <th className="text-right">إلى</th>
                    <th className="text-right">الحالة</th>
                    <th className="text-right">ملاحظة</th>
                    <th className="text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-tertiary text-sm">لا توجد تكليفات</td></tr>
                  )}
                  {filteredAssignments.map(a => {
                    const emp    = empMap[a.employeeId]
                    const branch = branchMap[a.branchId]
                    const isOpen = a.toDate === null
                    return (
                      <tr key={a.id}>
                        <td>
                          <span className="font-semibold text-primary text-sm">
                            {emp ? getEmpName(emp) : '—'}
                          </span>
                        </td>
                        <td><span className="text-secondary text-sm">{branch?.storeName ?? '—'}</span></td>
                        <td><span className="num text-xs text-secondary">{fmtDate(a.fromDate)}</span></td>
                        <td><span className="num text-xs text-secondary">{fmtDate(a.toDate)}</span></td>
                        <td>
                          {isOpen
                            ? <span className="badge" style={{ background: '#05966910', color: '#059669', borderColor: '#05966925' }}>نشط</span>
                            : <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}>منتهي</span>}
                        </td>
                        <td>
                          <span className="text-xs text-tertiary" title={a.note || undefined}>
                            {a.note ? (a.note.length > 24 ? a.note.slice(0, 24) + '…' : a.note) : '—'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditAssign(a)}
                              className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="تعديل">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDeleteAssign(a)}
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

            {/* Mobile */}
            <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {filteredAssignments.length === 0 && (
                <div className="p-10 text-center text-tertiary text-sm">لا توجد تكليفات</div>
              )}
              {filteredAssignments.map(a => {
                const emp    = empMap[a.employeeId]
                const branch = branchMap[a.branchId]
                const isOpen = a.toDate === null
                return (
                  <div key={a.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-bold text-primary text-sm truncate">
                          {emp ? getEmpName(emp) : '—'}
                        </p>
                        <p className="text-xs text-tertiary">{branch?.storeName ?? '—'}</p>
                      </div>
                      {isOpen
                        ? <span className="badge flex-shrink-0" style={{ background: '#05966910', color: '#059669', borderColor: '#05966925' }}>نشط</span>
                        : <span className="badge flex-shrink-0" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}>منتهي</span>}
                    </div>
                    <p className="text-xs text-tertiary num">{fmtDate(a.fromDate)} ← {fmtDate(a.toDate)}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => openEditAssign(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ color: WE, background: `${WE}12` }}>
                        <Pencil size={12} /> تعديل
                      </button>
                      <button onClick={() => handleDeleteAssign(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>
                        <Trash2 size={12} /> حذف
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {branchModal && (
        <BranchModal editing={branchEdit} onClose={closeBranchModal} onSave={handleBranchSave} />
      )}
      {assignModal && (
        <AssignmentModal
          editing={assignEdit} branches={branches}
          onClose={closeAssignModal} onSave={handleAssignSave}
        />
      )}
    </div>
  )
}
