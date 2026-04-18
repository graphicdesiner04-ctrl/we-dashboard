import { Menu, Sun, Moon, Calendar, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme }    from '@/context/ThemeContext'
import { useAuth }     from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

// ── Page titles ───────────────────────────────────────────────────────────

const TITLES_AR: Record<string, string> = {
  '/overview':         'نظرة عامة',
  '/schedule':         'الجدول',
  '/permissions':      'ساعات الإذن',
  '/annual-leave':     'الإجازة السنوية',
  '/sick-leave':       'الإجازة المرضية',
  '/instead-of':       'بدلاً من',
  '/branch-technical': 'البنية التقنية للفروع',
  '/employees':        'إدارة الموظفين',
  '/branches':         'الفروع والتكليفات',
  '/day-off':          'العمل في الإجازة',
  '/upload':           'مركز الرفع',
}

const TITLES_EN: Record<string, string> = {
  '/overview':         'Overview',
  '/schedule':         'Schedule',
  '/permissions':      'Permission Hours',
  '/annual-leave':     'Annual Leave',
  '/sick-leave':       'Sick Leave',
  '/instead-of':       'Instead Of',
  '/branch-technical': 'Branch Technical Infrastructure',
  '/employees':        'Employee Management',
  '/branches':         'Branches & Assignments',
  '/day-off':          'Working on Day Off',
  '/upload':           'Upload Center',
}

// ── Role label (Arabic) ───────────────────────────────────────────────────

const ROLE_AR: Record<string, string> = {
  Senior:     'Senior دعم فني',
  Super:      'سوبر دعم فني',
  Supervisor: 'مشرف الدعم الفني',
  Admin:      'مدير النظام',
}
const ROLE_EN: Record<string, string> = {
  Senior:     'Technical Support Senior',
  Super:      'Super Technical Support',
  Supervisor: 'Technical Support Supervisor',
  Admin:      'System Admin',
}

function arabicMonth() {
  return new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' })
}

// ── TopBar ────────────────────────────────────────────────────────────────

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { pathname }           = useLocation()
  const navigate               = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { session, logout }    = useAuth()
  const { lang, toggleLang, dir } = useLanguage()

  const isAr    = lang === 'ar'
  const TITLES  = isAr ? TITLES_AR : TITLES_EN
  const ROLE_LB = isAr ? ROLE_AR   : ROLE_EN

  const title   = TITLES[pathname] ?? 'WE Support'
  const name    = session?.name    ?? ''
  const roleStr = ROLE_LB[session?.role ?? ''] ?? ''
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
        direction: dir,
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

      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition-colors hover:bg-elevated"
        style={{ color: 'var(--text-secondary)', letterSpacing: '0.03em' }}
        title={isAr ? 'Switch to English' : 'التبديل للعربية'}
      >
        <span style={{ color: isAr ? 'var(--text-tertiary)' : '#6B21A8' }}>EN</span>
        <span className="mx-0.5 text-tertiary">|</span>
        <span style={{ color: isAr ? '#6B21A8' : 'var(--text-tertiary)' }}>ع</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-elevated transition-colors"
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* Divider */}
      <div className="hidden sm:block w-px h-5" style={{ background: 'var(--border-strong)' }} />

      {/* User info */}
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:block text-right leading-tight">
          <p className="text-xs font-bold text-primary">{name}</p>
          {roleStr && <p className="text-[10px] text-tertiary">{roleStr}</p>}
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
