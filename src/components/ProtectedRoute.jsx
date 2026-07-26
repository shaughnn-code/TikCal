import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Nav } from './Nav.jsx'
import { Spinner } from './ui.jsx'

// Gates authenticated routes. Redirects to /login when signed out, and to
// /setup until the profile is complete. Renders the shared Nav + page outlet.
export const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />

  // Profile row may still be loading right after signup; wait for it.
  if (profile === null) return <Spinner />

  if (!profile.setup_complete && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return (
    // The app shell for every signed-in route. `pb-[var(--sab)]` keeps the last
    // row of content clear of the iOS home indicator / Android gesture bar.
    // box-sizing is border-box globally, so the padding sits *inside* the 100vh
    // of min-h-screen — it adds no phantom scroll. 0px on the web.
    <div className="min-h-screen pb-[var(--sab)]">
      <Nav />
      <Outlet />
    </div>
  )
}
