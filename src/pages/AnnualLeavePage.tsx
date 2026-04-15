import { useState, useEffect } from 'react'
import { Calendar, HardDrive, Trash2, RotateCcw } from 'lucide-react'
import AnnualLeaveKPICards    from '@/components/hr/AnnualLeaveKPICards'
import EmployeeFilter         from '@/components/hr/EmployeeFilter'
import AnnualLeaveForm        from '@/components/hr/AnnualLeaveForm'
import AnnualLeaveTable       from '@/components/hr/AnnualLeaveTable'
import AnnualLeaveSummaryCard from '@/components/hr/AnnualLeaveSummaryCard'
import { useAnnualLeave }     from '@/hooks/useAnnualLeave'
import { getEmpName }         from '@/data/seedData'
import { storage }            from '@/lib/storage'
import type { AnnualLeaveRecord } from '@/types/hr'
import type { AnnualLeaveInput }  from '@/hooks/useAnnualLeave'

const WE = '#6B21A8'

export default function AnnualLeavePage() {
  const { employees, branches, records, summaries, kpi, addRecord, updateRecord, deleteRecord, resetRecords } =
    useAnnualLeave()

  const [editing,     setEditing]     = useState<AnnualLeaveRecord | null>(null)
  const [selectedEmp, setSelectedEmp] = useState<string>(() => storage.get('al-ui-emp', ''))
  const [branchId,    setBranchId]    = useState<string>(() => storage.get('al-ui-branch', ''))
  const [search,      setSearch]      = useState<string>(() => storage.get('al-ui-search', ''))

  useEffect(() => { storage.set('al-ui-emp',    selectedEmp) }, [selectedEmp])
  useEffect(() => { storage.set('al-ui-branch', branchId)    }, [branchId])
  useEffect(() => { storage.set('al-ui-search', search)      }, [search])

  function handleSubmit(data: AnnualLeaveInput) {
    if (editing) { updateRecord(editing.id, data); setEditing(null) }
    else         { addRecord(data) }
    setSelectedEmp(data.employeeId)
  }

  function handleEdit(rec: AnnualLeaveRecord) {
    setEditing(rec)
    setSelectedEmp(rec.employeeId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDelete(id: string) {
    if (window.confirm('هل تريد حذف هذا السجل؟')) deleteRecord(id)
  }

  function handleResetRecords() {
    if (window.confirm('سيتم حذف جميع سجلات الإجازة السنوية. هل أنت متأكد؟')) {
      resetRecords(); setEditing(null)
    }
  }

  function handleResetAll() {
    if (window.confirm('سيتم إعادة تعيين كل شيء. هل أنت متأكد؟')) {
      resetRecords(); setEditing(null)
      setSelectedEmp(''); setBranchId(''); setSearch('')
    }
  }

  const selectedSummary = summaries.find(s => s.employee.id === selectedEmp) ?? null
  const year = new Date().getFullYear()

  const filteredCount = records.filter(r => {
    if (branchId && r.branchId !== branchId) return false
    if (search) {
      const empMap = Object.fromEntries(employees.map(e => [e.id, e]))
      const emp = empMap[r.employeeId]
      if (!emp) return false
      const q = search.toLowerCase()
      if (!getEmpName(emp).toLowerCase().includes(q)) return false
    }
    return true
  }).length

  return (
    <div style={{ direction: 'rtl' }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.14)' }}>
              <Calendar size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">الإجازة السنوية</h1>
          </div>
          <p className="text-sm text-secondary">إدارة وتتبع أيام الإجازة السنوية · سنة {year}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Calendar size={12} />
          <span>الحد: 21 يوم / سنة</span>
        </div>
      </div>

      <AnnualLeaveKPICards kpi={kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5">

        {/* Left column */}
        <div className="flex flex-col gap-4 lg:self-start lg:sticky lg:top-[72px]">
          <AnnualLeaveForm
            employees={employees} branches={branches} summaries={summaries}
            editingRecord={editing} onSubmit={handleSubmit}
            onCancelEdit={() => setEditing(null)} onEmployeeSelect={setSelectedEmp}
          />
          <AnnualLeaveSummaryCard summary={selectedSummary} branches={branches} />

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
            <HardDrive size={12} style={{ color: WE, opacity: 0.7 }} />
            <span>يتم الحفظ تلقائياً على هذا الجهاز</span>
          </div>

          <div className="card p-3 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-1">إعادة التعيين</p>
            <button onClick={handleResetRecords} disabled={records.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: '#DC2626' }}>
              <Trash2 size={13} /><span>حذف سجلات الإجازة</span>
            </button>
            <button onClick={handleResetAll}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-elevated"
              style={{ color: 'var(--text-secondary)' }}>
              <RotateCcw size={13} /><span>إعادة تعيين الكل</span>
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-0">
          <EmployeeFilter branches={branches} filterBranch={branchId} filterSearch={search}
            onBranchChange={setBranchId} onSearchChange={setSearch} />

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-primary">سجلات الإجازة السنوية</h2>
            <div className="flex items-center gap-1.5 text-xs text-tertiary">
              {(branchId || search) && (
                <><span className="font-semibold text-secondary">{filteredCount}</span><span>نتيجة ·</span></>
              )}
              <span>{records.length} سجل إجمالي</span>
            </div>
          </div>

          <AnnualLeaveTable
            records={records} employees={employees} branches={branches} summaries={summaries}
            filterBranch={branchId} filterSearch={search} onEdit={handleEdit} onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}
