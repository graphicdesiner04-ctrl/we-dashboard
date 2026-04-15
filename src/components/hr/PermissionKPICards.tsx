import { Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PermissionsKPI } from '@/types/hr'

// WE palette
const C = { blue: '#6B21A8', amber: '#D97706', green: '#059669', red: '#DC2626' }

function Card({
  title, value, sub, color, Icon,
}: {
  title: string
  value: string | number
  sub: string
  color: string
  Icon: LucideIcon
}) {
  return (
    <div className="kpi-card count-in" style={{ borderRightColor: color }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-secondary uppercase tracking-wide mb-1 truncate">
            {title}
          </p>
          <p className="text-2xl font-black num leading-tight" style={{ color }}>
            {value}
          </p>
          <p className="text-xs text-tertiary mt-1 truncate">{sub}</p>
        </div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}16` }}
        >
          <Icon size={21} style={{ color }} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  )
}

export default function PermissionKPICards({ kpi }: { kpi: PermissionsKPI }) {
  const month = new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' })
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card title="إجمالي الموظفين"  value={kpi.totalEmployees}               sub="الفريق الكامل"               color={C.blue}                                         Icon={Users}        />
      <Card title="ساعات مستخدمة"    value={`${kpi.totalUsedHours} س`}        sub={month}                       color={C.amber}                                        Icon={Clock}        />
      <Card title="رصيد متبقٍ"       value={`${kpi.totalRemainingHours} س`}   sub={`من ${kpi.totalEmployees * 4} ساعة إجمالي`} color={C.green}                         Icon={CheckCircle2} />
      <Card title="تجاوز الحد"       value={kpi.employeesOverLimit}            sub="موظف تجاوز 4 ساعات/شهر"   color={kpi.employeesOverLimit > 0 ? C.red : C.green}   Icon={AlertTriangle} />
    </div>
  )
}
