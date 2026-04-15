import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { DesktopSidebar, MobileDrawer } from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    // direction: ltr on the outer shell so the sidebar sits on the physical LEFT.
    // The content column overrides back to RTL for Arabic layout.
    <div className="flex min-h-screen" style={{ direction: 'ltr', background: 'var(--bg-base)' }}>
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ direction: 'rtl' }}>
        <TopBar onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
