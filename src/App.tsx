import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout           from '@/components/layout/AppLayout'
import LoginPage           from '@/pages/LoginPage'
import OverviewPage        from '@/pages/OverviewPage'
import PermissionsPage     from '@/pages/PermissionsPage'
import AnnualLeavePage     from '@/pages/AnnualLeavePage'
import BranchTechnicalPage from '@/pages/BranchTechnicalPage'
import EmployeesPage       from '@/pages/EmployeesPage'
import BranchesPage        from '@/pages/BranchesPage'
import SickLeavePage       from '@/pages/SickLeavePage'
import InsteadOfPage       from '@/pages/InsteadOfPage'
import SchedulePage        from '@/pages/SchedulePage'

// ── Protected layout wrapper ──────────────────────────────────────────────
// Redirects to /login if user is not authenticated.
// AppLayout renders the <Outlet /> for nested routes.

function ProtectedLayout() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AppLayout />
}

// ── App ───────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview"         element={<OverviewPage />} />
        <Route path="/permissions"      element={<PermissionsPage />} />
        <Route path="/annual-leave"     element={<AnnualLeavePage />} />
        <Route path="/branch-technical" element={<BranchTechnicalPage />} />
        <Route path="/employees"        element={<EmployeesPage />} />
        <Route path="/branches"         element={<BranchesPage />} />
        <Route path="/sick-leave"       element={<SickLeavePage />} />
        <Route path="/instead-of"       element={<InsteadOfPage />} />
        <Route path="/schedule"         element={<SchedulePage />} />
        {/* Future: /day-off, /upload */}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  )
}
