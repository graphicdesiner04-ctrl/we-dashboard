import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Clock, Calendar, HeartPulse,
  Repeat2, CalendarOff, Upload, Server,
  Users, GitBranch, CalendarDays,
  ChevronLeft, ChevronRight, X, LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth }     from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

// ── Nav structure ─────────────────────────────────────────────────────────

const MAIN_NAV = [
  { path: '/overview',         icon: LayoutDashboard, labelAr: 'نظرة عامة',          labelEn: 'Overview'               },
  { path: '/schedule',         icon: CalendarDays,    labelAr: 'الجدول',             labelEn: 'Schedule'               },
  { path: '/permissions',      icon: Clock,           labelAr: 'ساعات الإذن',        labelEn: 'Permission Hours'       },
  { path: '/annual-leave',     icon: Calendar,        labelAr: 'الإجازة السنوية',    labelEn: 'Annual Leave'           },
  { path: '/sick-leave',       icon: HeartPulse,      labelAr: 'الإجازة المرضية',    labelEn: 'Sick Leave'             },
  { path: '/instead-of',       icon: Repeat2,         labelAr: 'بدلاً من',           labelEn: 'Instead Of'             },
  { path: '/day-off',          icon: CalendarOff,     labelAr: 'عمل يوم الإجازة',   labelEn: 'Working in Day Off'     },
  { path: '/branch-technical', icon: Server,          labelAr: 'البنية التقنية',     labelEn: 'Technical Infra'        },
  { path: '/employees',        icon: Users,           labelAr: 'الموظفون',           labelEn: 'Employees'              },
  { path: '/branches',         icon: GitBranch,       labelAr: 'الفروع والتكليفات',  labelEn: 'Branches & Assignments' },
]

const SOON_NAV = [
  { path: '/upload', icon: Upload, labelAr: 'مركز الرفع', labelEn: 'Upload Center' },
]

// ── Logo ring ─────────────────────────────────────────────────────────────

function LogoRing({ size = 46 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{ width: size, height: size, border: '2px dashed rgba(255,255,255,0.18)', padding: 3 }}
    >
      <div
        className="w-full h-full rounded-full flex items-center justify-center font-black text-white"
        style={{
          background: 'linear-gradient(135deg,#6B21A8 0%,#4C1D95 100%)',
          fontSize: Math.round(size * 0.28),
          letterSpacing: '-0.02em',
        }}
      >
        WE
      </div>
    </div>
  )
}

// ── Active nav link ───────────────────────────────────────────────────────

function ActiveLink({
  path, icon: Icon, labelAr, labelEn, collapsed, onClick,
}: {
  path: string; icon: LucideIcon; labelAr: string; labelEn: string; collapsed: boolean; onClick?: () => void
}) {
  const { lang } = useLanguage()
  const label = lang === 'en' ? labelEn : labelAr
  return (
    <NavLink
      to={path}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
          collapsed && 'justify-center px-2',
          isActive ? 'text-white' : 'hover:bg-white/5 hover:text-white/85',
        )
      }
      style={({ isActive }) =>
        isActive
          ? { background: 'rgba(107,33,168,0.20)', color: '#fff' }
          : { color: 'rgba(255,255,255,0.52)' }
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
              style={{ background: '#6B21A8' }}
            />
          )}
          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? '#C084FC' : 'currentColor'} />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  )
}

// ── Disabled "coming soon" item ───────────────────────────────────────────

function SoonItem({ icon: Icon, labelAr, labelEn, collapsed }: { icon: LucideIcon; labelAr: string; labelEn: string; collapsed: boolean }) {
  const { lang, t } = useLanguage()
  const label = lang === 'en' ? labelEn : labelAr
  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 select-none opacity-40',
        collapsed && 'justify-center px-2',
      )}
      title={collapsed ? `${label} — ${t('nav.soon')}` : undefined}
    >
      <Icon size={17} strokeWidth={1.6} color="rgba(255,255,255,0.7)" />
      {!collapsed && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {label}
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}
          >
            {t('nav.soon')}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────

function SectionLabel({ label, show }: { label: string; show: boolean }) {
  if (!show) return null
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1 mt-3 select-none"
      style={{ color: 'rgba(255,255,255,0.25)' }}
    >
      {label}
    </p>
  )
}

// ── Sidebar content ───────────────────────────────────────────────────────

function SidebarContent({
  collapsed = false,
  onClose,
}: {
  collapsed?: boolean
  onClose?: () => void
}) {
  const { session, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const name    = session?.name ?? ''
  const initial = name.trim().charAt(0).toUpperCase()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Logo / Brand */}
      <div
        className={clsx(
          'flex items-center gap-3 py-5 border-b',
          collapsed ? 'justify-center px-3' : 'px-4',
          onClose && 'pr-2',
        )}
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <LogoRing size={collapsed ? 38 : 46} />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-snug">WE Technical</p>
            <p className="text-white font-black text-sm leading-snug">Support</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#C084FC' }}>Dashboard</p>
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg flex-shrink-0 transition-colors hover:bg-white/8"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <SectionLabel label={t('nav.main')} show={!collapsed} />
        {MAIN_NAV.map(item => (
          <ActiveLink key={item.path} {...item} collapsed={collapsed} onClick={onClose} />
        ))}

        {collapsed
          ? <div className="my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />
          : <SectionLabel label={t('nav.soon')} show />
        }
        {SOON_NAV.map(item => (
          <SoonItem key={item.path} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* User strip + logout */}
      {!collapsed && session && (
        <div
          className="px-4 py-3 border-t flex items-center gap-3"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {name}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {session.username}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/8 flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            title={t('btn.logout')}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FCA5A5' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      )}
    </>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { t } = useLanguage()

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 transition-all duration-200 overflow-hidden',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
      style={{
        background: '#070F20',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <SidebarContent collapsed={collapsed} />

      {/* Collapse toggle */}
      <div className="p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-white/5',
            collapsed && 'justify-center',
          )}
          style={{ color: 'rgba(255,255,255,0.35)' }}
          title={collapsed ? t('btn.expand') : t('btn.collapse')}
        >
          {collapsed
            ? <ChevronRight size={15} />
            : <><ChevronLeft size={15} /><span>{t('btn.collapse')}</span></>
          }
        </button>
      </div>
    </aside>
  )
}

// ── Mobile drawer ─────────────────────────────────────────────────────────

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />
      <aside
        className="fixed top-0 left-0 h-full w-[260px] flex flex-col z-50 md:hidden overflow-hidden"
        style={{
          background: '#070F20',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  )
}
