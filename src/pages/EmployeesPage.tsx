import { useState, useMemo } from 'react'
import { Users, Plus, Pencil, Trash2, X, Save, Search, ChevronDown } from 'lucide-react'
import { useEmployees } from '@/hooks/useEmployees'
import { useSchedule }  from '@/hooks/useSchedule'
import { getAllEmployees } from '@/core/dataEngine'
import { getEmpName }   from '@/data/seedData'
import { useRegion }    from '@/context/RegionContext'
import type { Employee, EmployeeRole } from '@/types/hr'
import type { EmployeeInput } from '@/hooks/useEmployees'

const WE = '#6B21A8'

// ── Helpers ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role?: EmployeeRole }) {
  if (!role) return <span className="text-tertiary text-xs">—</span>
  if (role === 'Supervisor')
    return <span className="badge" style={{ background: '#92400e15', color: '#D97706', borderColor: '#92400e30' }}>Supervisor</span>
  if (role === 'Senior')
    return <span className="badge" style={{ background: '#6B21A810', color: WE, borderColor: '#6B21A825' }}>Senior</span>
  return <span className="badge" style={{ background: '#05966910', color: '#059669', borderColor: '#05966925' }}>Agent</span>
}

// ── Empty form ────────────────────────────────────────────────────────────

const EMPTY: EmployeeInput = {
  domainName: '', user: '', name: '', nameEn: '', email: '',
  mobile: '', nationalId: '', employeeCode: '',
  level: 8, role: 'Agent', operatorAccount: '', dsPortalName: '',
}

// ── Employee Modal (add / edit) ───────────────────────────────────────────

function EmployeeModal({
  editing, onClose, onSave,
}: {
  editing: Employee | null
  onClose: () => void
  onSave: (input: EmployeeInput) => void
}) {
  const [form, setForm] = useState<EmployeeInput>(() =>
    editing
      ? {
          domainName:      editing.domainName      ?? '',
          user:            editing.user,
          name:            editing.name,
          nameEn:          editing.nameEn,
          email:           editing.email,
          mobile:          editing.mobile,
          nationalId:      editing.nationalId,
          employeeCode:    editing.employeeCode,
          level:           editing.level            ?? 8,
          role:            editing.role             ?? 'Agent',
          operatorAccount: editing.operatorAccount  ?? '',
          dsPortalName:    editing.dsPortalName     ?? '',
        }
      : EMPTY,
  )

  function set(field: keyof EmployeeInput, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  const isEdit = !!editing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${WE}16` }}>
              {isEdit ? <Pencil size={15} style={{ color: WE }} /> : <Plus size={15} style={{ color: WE }} />}
            </div>
            <h2 className="text-sm font-black text-primary">
              {isEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3" style={{ direction: 'rtl' }}>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">اسم النطاق (Domain)</label>
              <input value={form.domainName} onChange={e => set('domainName', e.target.value)}
                placeholder="Ahmed.G.Hafez" className="we-input" />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">اسم المستخدم</label>
              <input value={form.user} onChange={e => set('user', e.target.value)}
                placeholder="ahmed.g.hafez" className="we-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">الاسم (عربي)</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="أحمد جلال حافظ" className="we-input" dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">الاسم (إنجليزي)</label>
              <input value={form.nameEn} onChange={e => set('nameEn', e.target.value)}
                placeholder="Ahmed Galal Hafez" className="we-input" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="ahmed@te.eg" className="we-input" dir="ltr" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">رقم الموبايل</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                placeholder="01xxxxxxxxx" className="we-input" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">الرقم الوظيفي</label>
              <input value={form.employeeCode} onChange={e => set('employeeCode', e.target.value)}
                placeholder="236311" className="we-input" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الرقم القومي</label>
            <input value={form.nationalId} onChange={e => set('nationalId', e.target.value)}
              placeholder="2xxxxxxxxxxxxxxxxx" className="we-input" dir="ltr" maxLength={14} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">المستوى الوظيفي</label>
              <select value={form.level} onChange={e => set('level', +e.target.value)} className="we-input">
                <option value={6}>6 — Supervisor</option>
                <option value={7}>7 — Senior</option>
                <option value={8}>8 — Agent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">الدور</label>
              <select value={form.role} onChange={e => set('role', e.target.value as EmployeeRole)} className="we-input">
                <option value="Supervisor">Supervisor</option>
                <option value="Senior">Senior</option>
                <option value="Agent">Agent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">حساب المشغّل</label>
            <input value={form.operatorAccount} onChange={e => set('operatorAccount', e.target.value)}
              placeholder="Ahmed Galal Hassan Hafez" className="we-input" dir="ltr" />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">اسم بوابة DS</label>
            <input value={form.dsPortalName} onChange={e => set('dsPortalName', e.target.value)}
              placeholder="Ahmed Galal Hassan Hafez" className="we-input" dir="ltr" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              {isEdit ? <><Save size={14} />حفظ التعديلات</> : <><Plus size={14} />إضافة الموظف</>}
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

export default function EmployeesPage() {
  const { region } = useRegion()
  // CRUD operations on profile registry
  const { addEmployee, updateEmployee, deleteEmployee } = useEmployees()

  // Reactive schedule entries — re-derive employees whenever schedule changes
  const { entries, employees: scheduleEmployees } = useSchedule(region)

  // employees = only those who appear in at least one schedule entry, filtered by region
  const allEmployees = useMemo(
    () => getAllEmployees(entries, scheduleEmployees),
    [entries, scheduleEmployees],
  )
  const employees = useMemo(
    () => allEmployees.filter(e => (e.region ?? 'south') === region),
    [allEmployees, region],
  )

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editTarget,  setEditTarget]  = useState<Employee | null>(null)
  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState<'' | 'Supervisor' | 'Senior' | 'Agent'>('')
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  const ROLE_ORDER: Record<string, number> = { Supervisor: 0, Senior: 1, Agent: 2 }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return employees
      .filter(emp => {
        if (roleFilter && emp.role !== roleFilter) return false
        if (!q) return true
        return (
          getEmpName(emp).toLowerCase().includes(q) ||
          (emp.domainName ?? '').toLowerCase().includes(q) ||
          emp.employeeCode.includes(q) ||
          emp.mobile.includes(q)
        )
      })
      .sort((a, b) => {
        const ra = ROLE_ORDER[a.role ?? 'Agent'] ?? 2
        const rb = ROLE_ORDER[b.role ?? 'Agent'] ?? 2
        if (ra !== rb) return ra - rb
        return getEmpName(a).localeCompare(getEmpName(b))
      })
  }, [employees, search, roleFilter])

  function openAdd()  { setEditTarget(null); setModalOpen(true) }
  function openEdit(emp: Employee) { setEditTarget(emp); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditTarget(null) }

  function handleSave(input: EmployeeInput) {
    if (editTarget) updateEmployee(editTarget.id, input)
    else            addEmployee(input)
    closeModal()
  }

  function handleDelete(emp: Employee) {
    if (window.confirm(`هل تريد حذف الموظف "${getEmpName(emp)}"؟`)) {
      deleteEmployee(emp.id)
    }
  }

  const supervisors = employees.filter(e => e.role === 'Supervisor').length
  const seniors     = employees.filter(e => e.role === 'Senior').length
  const agents      = employees.filter(e => e.role === 'Agent').length

  return (
    <div style={{ direction: 'rtl' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.14)' }}>
              <Users size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">إدارة الموظفين</h1>
          </div>
          <p className="text-sm text-secondary">
            {employees.length} موظف إجمالي · {supervisors} Supervisor · {seniors} Senior · {agents} Agent
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Plus size={15} />
          إضافة موظف
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الكود أو الموبايل..."
            className="we-input pr-8 w-full"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as '' | 'Supervisor' | 'Senior' | 'Agent')}
          className="we-input w-auto min-w-[130px]">
          <option value="">جميع الأدوار</option>
          <option value="Supervisor">Supervisor فقط</option>
          <option value="Senior">Senior فقط</option>
          <option value="Agent">Agents فقط</option>
        </select>
        <span className="text-xs text-tertiary">{filtered.length} نتيجة</span>
      </div>

      {/* Table — desktop */}
      <div className="card overflow-hidden">
        <div className="hidden md:block table-scroll">
          <table className="we-table w-full min-w-[780px]">
            <thead>
              <tr>
                <th className="text-right">#</th>
                <th className="text-right">الاسم</th>
                <th className="text-right">اسم النطاق</th>
                <th className="text-right">الكود</th>
                <th className="text-right">البريد</th>
                <th className="text-right">الموبايل</th>
                <th className="text-right">الدور</th>
                <th className="text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-tertiary text-sm">
                    لا توجد نتائج
                  </td>
                </tr>
              )}
              {filtered.map((emp, idx) => (
                <tr key={emp.id}>
                  <td><span className="text-tertiary text-xs num">{idx + 1}</span></td>
                  <td>
                    <div>
                      <p className="font-semibold text-primary text-sm">{getEmpName(emp)}</p>
                      {emp.nameEn && emp.name && (
                        <p className="text-xs text-tertiary">{emp.nameEn}</p>
                      )}
                    </div>
                  </td>
                  <td><span className="text-xs text-secondary num">{emp.domainName ?? '—'}</span></td>
                  <td><span className="num text-sm font-semibold text-secondary">{emp.employeeCode || '—'}</span></td>
                  <td><span className="text-xs text-tertiary num">{emp.email || '—'}</span></td>
                  <td><span className="num text-sm text-secondary">{emp.mobile || '—'}</span></td>
                  <td><RoleBadge role={emp.role} /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(emp)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="تعديل">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(emp)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors" title="حذف">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-tertiary text-sm">لا توجد نتائج</div>
          )}
          {filtered.map(emp => (
            <div key={emp.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-primary text-sm truncate">{getEmpName(emp)}</p>
                  <p className="text-xs text-tertiary truncate">{emp.domainName ?? emp.user}</p>
                </div>
                <RoleBadge role={emp.role} />
              </div>

              {/* Expandable details */}
              <button onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                className="flex items-center gap-1 text-xs text-tertiary mt-2">
                <ChevronDown size={13} className={`transition-transform ${expandedId === emp.id ? 'rotate-180' : ''}`} />
                {expandedId === emp.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
              </button>

              {expandedId === emp.id && (
                <div className="mt-3 space-y-1.5 text-xs">
                  {emp.employeeCode && <div className="flex gap-2"><span className="text-tertiary w-24">الكود:</span><span className="text-secondary num">{emp.employeeCode}</span></div>}
                  {emp.email        && <div className="flex gap-2"><span className="text-tertiary w-24">البريد:</span><span className="text-secondary num">{emp.email}</span></div>}
                  {emp.mobile       && <div className="flex gap-2"><span className="text-tertiary w-24">الموبايل:</span><span className="text-secondary num">{emp.mobile}</span></div>}
                  {emp.nationalId   && <div className="flex gap-2"><span className="text-tertiary w-24">الرقم القومي:</span><span className="text-secondary num">{emp.nationalId}</span></div>}
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => openEdit(emp)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ color: WE, background: `${WE}12` }}>
                  <Pencil size={12} /> تعديل
                </button>
                <button onClick={() => handleDelete(emp)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>
                  <Trash2 size={12} /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <EmployeeModal editing={editTarget} onClose={closeModal} onSave={handleSave} />
      )}
    </div>
  )
}
