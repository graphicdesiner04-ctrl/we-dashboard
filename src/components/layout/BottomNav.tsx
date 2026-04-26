import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Clock, Users, MoreHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const BOTTOM_NAV: { path: string; icon: LucideIcon; label: string }[] = [
  { path: '/overview',    icon: LayoutDashboard, label: 'نظرة عامة' },
  { path: '/schedule',   icon: CalendarDays,    label: 'الجدول'     },
  { path: '/permissions', icon: Clock,           label: 'الإذن'      },
  { path: '/employees',  icon: Users,           label: 'الموظفون'   },
]

export function BottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-center"
      style={{
        background: '#070F20',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {BOTTOM_NAV.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-opacity"
          style={({ isActive }) => ({
            color: isActive ? '#C084FC' : 'rgba(255,255,255,0.38)',
          })}
        >
          {({ isActive }) => (
            <>
              <div
                className="flex items-center justify-center rounded-xl transition-all"
                style={{
                  width: 38, height: 28,
                  background: isActive ? 'rgba(107,33,168,0.22)' : 'transparent',
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} color={isActive ? '#C084FC' : 'rgba(255,255,255,0.38)'} />
              </div>
              <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 500, lineHeight: 1 }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}

      {/* More button */}
      <button
        onClick={onMoreClick}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
        style={{ color: 'rgba(255,255,255,0.38)' }}
      >
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 38, height: 28 }}
        >
          <MoreHorizontal size={18} strokeWidth={1.7} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>المزيد</span>
      </button>
    </nav>
  )
}
