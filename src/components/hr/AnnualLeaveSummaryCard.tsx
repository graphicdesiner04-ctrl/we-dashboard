import { UserRound, AlertTriangle, CheckCircle2, MapPin } from 'lucide-react'
import type { AnnualLeaveSummary, Branch } from '@/types/hr'
import { ANNUAL_LEAVE_DAYS } from '@/types/hr'

interface Props {
  summary: AnnualLeaveSummary | null
  branches: Branch[]
}

export default function AnnualLeaveSummaryCard({ summary, branches }: Props) {
  if (!summary) {
    return (
      <div className="card p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[110px]">
        <UserRound size={26} className="text-tertiary" />
        <p className="text-sm text-tertiary">اختر موظفاً لعرض ملخصه السنوي</p>
      </div>
    )
  }

  const { employee, currentBranchId, totalDaysUsed, remainingDays, isOverLimit, recordsCount } = summary
  const pct    = Math.min(100, (totalDaysUsed / ANNUAL_LEAVE_DAYS) * 100)
  const overBy = isOverLimit ? Math.round((totalDaysUsed - ANNUAL_LEAVE_DAYS) * 100) / 100 : 0
  const accent = isOverLimit ? '#DC2626' : '#6B21A8'
  const bar    = isOverLimit ? '#DC2626' : pct >= 75 ? '#D97706' : '#059669'

  const currentBranch = branches.find(b => b.id === currentBranchId)
  const initials = employee.name.split(' ').slice(0, 2).map(w => w[0]).join('')

  return (
    <div className="card p-4 overflow-hidden" style={{ borderTop: `3px solid ${accent}` }}>
      {/* Employee row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-primary truncate">{employee.name}</p>
          <p className="text-xs text-tertiary">{employee.employeeCode}</p>
        </div>
        {isOverLimit
          ? <AlertTriangle size={17} style={{ color: '#DC2626' }} />
          : <CheckCircle2  size={17} style={{ color: '#059669' }} />
        }
      </div>

      {/* Current branch */}
      <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg"
        style={{ background: 'var(--bg-elevated)' }}>
        <MapPin size={11} className="text-tertiary flex-shrink-0" />
        <span className="text-xs text-secondary truncate">
          {currentBranch ? currentBranch.storeName : <span className="text-tertiary italic">غير معين (Unassigned)</span>}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        {[
          { label: 'مستخدم', val: `${totalDaysUsed}ي`, color: isOverLimit ? '#DC2626' : '#D97706' },
          { label: 'متبقٍ',  val: `${remainingDays}ي`, color: '#059669' },
          { label: 'سجلات', val: `${recordsCount}`,    color: '#6B21A8' },
        ].map(({ label, val, color }) => (
          <div key={label} className="p-2 rounded-xl bg-elevated">
            <p className="text-[10px] text-tertiary mb-0.5">{label}</p>
            <p className="text-sm font-black num" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[11px] text-tertiary mb-1">
          <span className="num">{totalDaysUsed} / {ANNUAL_LEAVE_DAYS} يوم</span>
          <span className="num">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-elevated overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: bar }} />
        </div>
      </div>

      {isOverLimit && (
        <div className="mt-3 text-[11px] font-bold text-center py-1.5 px-3 rounded-xl"
          style={{ color: '#DC2626', background: '#DC262612', border: '1px solid #DC262622' }}>
          ⚠ تجاوز الحد بـ {overBy} يوم
        </div>
      )}
    </div>
  )
}
