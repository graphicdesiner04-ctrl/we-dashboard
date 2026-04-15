import { Pencil, Trash2, ClipboardList } from 'lucide-react'
import type { Employee, Branch, AnnualLeaveRecord, AnnualLeaveSummary } from '@/types/hr'
import { getEmpName } from '@/data/seedData'

const WE = '#6B21A8'

interface Props {
  records: AnnualLeaveRecord[]
  employees: Employee[]
  branches: Branch[]
  summaries: AnnualLeaveSummary[]
  filterBranch: string
  filterSearch: string
  onEdit: (r: AnnualLeaveRecord) => void
  onDelete: (id: string) => void
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ over }: { over: boolean }) {
  return over
    ? <span className="badge" style={{ background: '#DC262610', color: '#DC2626', borderColor: '#DC262625' }}>تجاوز الحد</span>
    : <span className="badge" style={{ background: '#05966910', color: '#059669', borderColor: '#05966925' }}>ضمن الحد</span>
}

function MobileCard({ rec, emp, branch, over, onEdit, onDelete }: {
  rec: AnnualLeaveRecord; emp: Employee | undefined; branch: Branch | undefined
  over: boolean; onEdit: (r: AnnualLeaveRecord) => void; onDelete: (id: string) => void
}) {
  return (
    <div className="p-4 border-b border-theme last:border-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-bold text-primary text-sm truncate">{emp ? getEmpName(emp) : '—'}</p>
          <p className="text-xs text-tertiary">{branch?.storeName ?? '—'} · {fmtDate(rec.date)}</p>
        </div>
        <StatusBadge over={over} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-secondary">الأيام:</span>
        <span className="text-sm font-bold num" style={{ color: WE }}>{rec.days} {rec.days === 1 ? 'يوم' : 'أيام'}</span>
      </div>
      {rec.note && (
        <p className="text-xs text-secondary italic mb-2 truncate" title={rec.note}>{rec.note}</p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onEdit(rec)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ color: WE, background: `${WE}12` }}>
          <Pencil size={12} /> تعديل
        </button>
        <button onClick={() => onDelete(rec.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>
          <Trash2 size={12} /> حذف
        </button>
      </div>
    </div>
  )
}

export default function AnnualLeaveTable({
  records, employees, branches, summaries, filterBranch, filterSearch, onEdit, onDelete,
}: Props) {
  const empMap    = Object.fromEntries(employees.map(e => [e.id, e]))
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]))
  const overSet   = new Set(summaries.filter(s => s.isOverLimit).map(s => s.employee.id))

  const filtered = records.filter(r => {
    if (filterBranch && r.branchId !== filterBranch) return false
    if (filterSearch) {
      const emp = empMap[r.employeeId]
      if (!emp) return false
      const q = filterSearch.toLowerCase()
      if (!getEmpName(emp).toLowerCase().includes(q)) return false
    }
    return true
  })

  if (filtered.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center gap-3 text-center">
        <ClipboardList size={38} className="text-tertiary" strokeWidth={1.4} />
        <p className="text-secondary font-semibold text-sm">لا توجد سجلات</p>
        <p className="text-tertiary text-xs">
          {records.length === 0
            ? 'ابدأ بإضافة أول إجازة من النموذج على اليسار'
            : 'لا توجد نتائج تطابق التصفية الحالية'}
        </p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Mobile */}
      <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
        {filtered.map(rec => (
          <MobileCard key={rec.id} rec={rec}
            emp={empMap[rec.employeeId]} branch={branchMap[rec.branchId]}
            over={overSet.has(rec.employeeId)} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block table-scroll">
        <table className="we-table w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="text-right">الموظف</th>
              <th className="text-right">الفرع</th>
              <th className="text-right">التاريخ</th>
              <th className="text-right">الأيام</th>
              <th className="text-right">ملاحظة</th>
              <th className="text-right">الحالة</th>
              <th className="text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(rec => {
              const emp    = empMap[rec.employeeId]
              const branch = branchMap[rec.branchId]
              const over   = overSet.has(rec.employeeId)
              return (
                <tr key={rec.id}>
                  <td><span className="font-semibold text-primary text-sm">{emp ? getEmpName(emp) : '—'}</span></td>
                  <td><span className="text-secondary text-xs">{branch?.storeName ?? '—'}</span></td>
                  <td><span className="num text-secondary text-xs">{fmtDate(rec.date)}</span></td>
                  <td><span className="num font-black text-sm" style={{ color: WE }}>{rec.days}</span></td>
                  <td>
                    <span className="text-secondary text-xs" title={rec.note || undefined}>
                      {rec.note ? (rec.note.length > 26 ? rec.note.slice(0, 26) + '…' : rec.note) : <span className="text-tertiary">—</span>}
                    </span>
                  </td>
                  <td><StatusBadge over={over} /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(rec)}
                        className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="تعديل">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(rec.id)}
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
