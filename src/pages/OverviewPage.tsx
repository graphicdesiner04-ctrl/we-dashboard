import { NavLink } from 'react-router-dom'
import {
  Clock, Calendar, HeartPulse, Repeat2, CalendarOff, Upload,
  Server, ArrowLeft, CalendarDays, Users, GitBranch, AlertTriangle, Star,
} from 'lucide-react'
import { useDataEngine } from '@/hooks/useDataEngine'

const ACTIVE_MODULES = [
  {
    path: '/schedule',
    icon: CalendarDays,
    label: 'الجدول',
    desc: 'جدول الحضور والتواجد الشهري للموظفين',
    color: '#6B21A8',
  },
  {
    path: '/permissions',
    icon: Clock,
    label: 'ساعات الإذن',
    desc: 'إدارة وتتبع أذونات الموظفين الشهرية',
    color: '#6B21A8',
  },
  {
    path: '/annual-leave',
    icon: Calendar,
    label: 'الإجازة السنوية',
    desc: 'إدارة أيام الإجازة السنوية · 21 يوم / سنة',
    color: '#6B21A8',
  },
  {
    path: '/sick-leave',
    icon: HeartPulse,
    label: 'الإجازة المرضية',
    desc: 'تسجيل ومتابعة الإجازات المرضية',
    color: '#6B21A8',
  },
  {
    path: '/instead-of',
    icon: Repeat2,
    label: 'بدلاً من',
    desc: 'عمل في إجازة رسمية · متابعة أيام البدل المستحقة',
    color: '#6B21A8',
  },
  {
    path: '/day-off',
    icon: CalendarOff,
    label: 'عمل يوم الإجازة',
    desc: 'تغطية طارئة · تصدير شيت الشركة في نهاية الشهر',
    color: '#6B21A8',
  },
  {
    path: '/branch-technical',
    icon: Server,
    label: 'البنية التقنية للفروع',
    desc: 'بيانات الشبكة والأجهزة والبنية التحتية لكل فرع',
    color: '#6B21A8',
  },
  {
    path: '/employees',
    icon: Users,
    label: 'الموظفون',
    desc: 'إدارة بيانات الموظفين وأكواد العمل',
    color: '#6B21A8',
  },
  {
    path: '/branches',
    icon: GitBranch,
    label: 'الفروع والتكليفات',
    desc: 'إدارة الفروع وتاريخ تكليفات الموظفين',
    color: '#6B21A8',
  },
  {
    path: '/evaluation',
    icon: Star,
    label: 'التقييمات',
    desc: 'تقييم أداء الموظفين إيجابياً وسلبياً · تجميع شهري',
    color: '#6B21A8',
  },
]

const COMING_MODULES = [
  { icon: Upload, label: 'مركز الرفع', desc: 'رفع الملفات والتقارير' },
]

const WE = '#6B21A8'

export default function OverviewPage() {
  const month = new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' })
  const { employeeStats, ouChangeAlerts, todayAssignments, EMPLOYEES, BRANCHES } = useDataEngine()

  const todayTotal  = Object.values(todayAssignments).reduce((s, a) => s + a.length, 0)
  const todayBranches = Object.keys(todayAssignments).filter(b => todayAssignments[b].length > 0).length
  const totalWorkDays = employeeStats.reduce((s, e) => s + e.totalWorkDays, 0)
  const pendingOU   = ouChangeAlerts.filter(a => a.date >= new Date().toISOString().slice(0, 10)).length

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-primary leading-tight">نظرة عامة</h1>
        <p className="text-sm text-secondary mt-1">
          مرحباً — نظام WE للدعم الفني · {month}
        </p>
      </div>

      {/* Live stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        <div className="card p-4 flex flex-col gap-1" style={{ borderRight: `3px solid ${WE}` }}>
          <span className="text-[11px] font-bold text-secondary">موظفو اليوم</span>
          <span className="text-2xl font-black num" style={{ color: WE }}>{todayTotal}</span>
          <span className="text-[10px] text-tertiary">{todayBranches} فرع نشط</span>
        </div>
        <div className="card p-4 flex flex-col gap-1" style={{ borderRight: `3px solid #059669` }}>
          <span className="text-[11px] font-bold text-secondary">أيام العمل المسجّلة</span>
          <span className="text-2xl font-black num" style={{ color: '#059669' }}>{totalWorkDays}</span>
          <span className="text-[10px] text-tertiary">{employeeStats.length} موظف نشط</span>
        </div>
        <div className="card p-4 flex flex-col gap-1" style={{ borderRight: `3px solid #D97706` }}>
          <span className="text-[11px] font-bold text-secondary">الفروع</span>
          <span className="text-2xl font-black num" style={{ color: '#D97706' }}>{BRANCHES.length}</span>
          <span className="text-[10px] text-tertiary">من أصل {EMPLOYEES.length} موظف</span>
        </div>
        <div className="card p-4 flex flex-col gap-1" style={{ borderRight: `3px solid ${pendingOU > 0 ? '#DC2626' : '#6B7280'}` }}>
          <span className="text-[11px] font-bold text-secondary">تغييرات OU مطلوبة</span>
          <span className="text-2xl font-black num" style={{ color: pendingOU > 0 ? '#DC2626' : 'var(--text-tertiary)' }}>{pendingOU}</span>
          <span className="text-[10px] text-tertiary">من اليوم فصاعداً</span>
        </div>
      </div>

      {/* OU Change alerts panel */}
      {ouChangeAlerts.length > 0 && (
        <div className="mb-7 card overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border)', background: 'rgba(220,38,38,0.05)' }}>
            <AlertTriangle size={14} style={{ color: '#DC2626' }} />
            <span className="font-bold text-sm text-primary flex-1">تغييرات OU المطلوبة</span>
            <span className="text-xs font-black num px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>
              {ouChangeAlerts.length}
            </span>
          </div>
          <div className="divide-y max-h-52 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
            {ouChangeAlerts.map((a, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-primary min-w-[100px]">{a.employeeName}</span>
                <span className="text-[11px] text-tertiary">
                  {a.fromBranch} → {a.toBranch}
                </span>
                <span className="text-[10px] num text-tertiary mr-auto">{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Active modules */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-tertiary uppercase tracking-widest mb-3">
          الوحدات المتاحة
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIVE_MODULES.map(mod => {
            const Icon = mod.icon
            return (
              <NavLink key={mod.path} to={mod.path} className="group block">
                <div
                  className="card p-5 transition-all duration-150 group-hover:shadow-md group-hover:-translate-y-0.5"
                  style={{ borderRight: `4px solid ${mod.color}` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: `${mod.color}16` }}
                    >
                      <Icon size={22} style={{ color: mod.color }} strokeWidth={1.8} />
                    </div>
                    <ArrowLeft
                      size={16}
                      className="text-tertiary group-hover:text-primary transition-colors mt-1"
                    />
                  </div>
                  <p className="font-bold text-primary text-sm mb-0.5">{mod.label}</p>
                  <p className="text-xs text-secondary leading-relaxed">{mod.desc}</p>
                </div>
              </NavLink>
            )
          })}
        </div>
      </section>

      {/* Coming soon */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-tertiary uppercase tracking-widest mb-3">
          قريباً
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMING_MODULES.map(mod => {
            const Icon = mod.icon
            return (
              <div
                key={mod.label}
                className="card p-5 opacity-55 cursor-not-allowed"
                style={{ borderRight: '4px solid var(--border-strong)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-elevated">
                    <Icon size={22} className="text-tertiary" strokeWidth={1.6} />
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
                  >
                    قريباً
                  </span>
                </div>
                <p className="font-bold text-primary text-sm mb-0.5">{mod.label}</p>
                <p className="text-xs text-secondary leading-relaxed">{mod.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* System info footer card */}
      <div
        className="card p-5 flex items-center gap-4"
        style={{ borderRight: '4px solid var(--we, #0066FF)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}
        >
          WE
        </div>
        <div>
          <p className="text-sm font-bold text-primary">WE Technical Support Dashboard</p>
          <p className="text-xs text-secondary mt-0.5">
            نظام متكامل لإدارة شؤون الموارد البشرية · الإصدار الأول
          </p>
        </div>
      </div>
    </div>
  )
}
