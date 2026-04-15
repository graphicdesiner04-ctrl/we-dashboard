import { Menu, Sun, Moon, Calendar, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useAuth }  from '@/context/AuthContext'

// ── Page titles ───────────────────────────────────────────────────────────

const TITLES: Record<string, string> = {
  '/overview':         'نظرة عامة',
  '/permissions':      'ساعات الإذن',
  '/annual-leave':     'الإجازة السنوية',
  '/branch-technical': 'البنية التقنية للفروع',
  '/employees':        'إدارة الموظفين',
  '/branches':         'إدارة الفروع والتكليفات',
  '/sick-leave':       'الإجازة المرضية',
  '/day-off':          'العمل في الإجازة',
  '/instead-of':       'بدلاً من',
  '/upload':           'مركز الرفع',
}

// ── Role label (Arabic) ───────────────────────────────────────────────────

const ROLE_AR: Record<string, string> = {
  Senior:     'سينيور دعم فني',
  Supervisor: 'مشرف الدعم الفني',
  Admin:      'مدير النظام',
}

function arabicMonth() {
  return new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' })
}

// ── TopBar ────────────────────────────────────────────────────────────────

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { pathname }        = useLocation()
  const navigate            = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { session, logout } = useAuth()

  const title   = TITLES[pathname] ?? 'WE Support'
  const name    = session?.name    ?? ''
  const roleAr  = ROLE_AR[session?.role ?? ''] ?? ''
  const initial = name.trim().charAt(0).toUpperCase()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="h-14 flex items-center gap-3 px-4 sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        direction: 'rtl',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors"
        aria-label="القائمة"
      >
        <Menu size={19} />
      </button>

      {/* Page title */}
      <h1 className="text-sm font-bold text-primary truncate">{title}</h1>

      <div className="flex-1" />

      {/* Current month pill */}
      <div
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
      >
        <Calendar size={12} className="text-tertiary" />
        <span>{arabicMonth()}</span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors"
        title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* Divider */}
      <div className="hidden sm:block w-px h-5" style={{ background: 'var(--border-strong)' }} />

      {/* User info */}
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:block text-right leading-tight">
          <p className="text-xs font-bold text-primary">{name}</p>
          {roleAr && <p className="text-[10px] text-tertiary">{roleAr}</p>}
        </div>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 cursor-default select-none"
          style={{ background: 'linear-gradient(135deg,#6B21A8,#4C1D95)' }}
          title={name}
        >
          {initial}
        </div>

        {/* Logout (desktop only) */}
        <button
          onClick={handleLogout}
          className="hidden sm:flex p-2 rounded-lg text-secondary hover:text-red-500 hover:bg-elevated transition-colors"
          title="تسجيل الخروج"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
