import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { DesktopSidebar, MobileDrawer } from './Sidebar'
import TopBar from './TopBar'
import { BottomNav } from './BottomNav'

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    // direction: ltr on the outer shell so the sidebar sits on the physical LEFT.
    // The content column overrides back to RTL for Arabic layout.
    <div className="flex min-h-screen" style={{ direction: 'ltr', background: 'var(--bg-base)' }}>
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ direction: 'rtl' }}>
        <TopBar onMenuClick={() => setDrawerOpen(true)} />
        {/* pb-16 on mobile = space for the bottom nav bar */}
        <main className="flex-1 p-3 md:p-6 overflow-auto pb-20 md:pb-6">
          <Outlet />
          <p className="text-center text-[10px] font-semibold mt-8 pb-2"
            style={{ color: 'var(--text-tertiary)', opacity: 0.55 }}>
            تم التصميم بواسطة م.أحمد حسن بهاء
          </p>
        </main>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <BottomNav onMoreClick={() => setDrawerOpen(true)} />
    </div>
  )
}
