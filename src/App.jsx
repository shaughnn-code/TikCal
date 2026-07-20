import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { Spinner } from './components/ui.jsx'

import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Setup from './pages/Setup.jsx'
import Welcome from './pages/Welcome.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Plan from './pages/Plan.jsx'
import Discover from './pages/Discover.jsx'
import EventDetail from './pages/EventDetail.jsx'
import AddEvent from './pages/AddEvent.jsx'
import Profile from './pages/Profile.jsx'
import Friends from './pages/Friends.jsx'
import Overlap from './pages/Overlap.jsx'
import OverlapSession from './pages/OverlapSession.jsx'
import DanceFloorLoader from './components/DanceFloorLoader.jsx'

// Guards the onboarding / profile-edit route: needs auth, renders full-screen
// (no Nav). Doubles as the editor once setup is complete.
const SetupGate = () => {
  const { user, profile, loading } = useAuth()
  if (loading || (user && profile === null)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return <Setup />
}

// Home: returning/logged-in users start in the app, not on the marketing page.
// Signed-in → calendar (or setup if onboarding isn't finished); everyone else
// sees the Landing page.
const HomeGate = () => {
  const { user, profile, loading } = useAuth()
  if (loading || (user && profile === null)) return <Spinner />
  if (user) return <Navigate to={profile?.setup_complete ? '/calendar' : '/setup'} replace />
  return <Landing />
}

// First-run intro: needs auth + completed setup, plays once until seen.
const WelcomeGate = () => {
  const { user, profile, loading } = useAuth()
  if (loading || (user && profile === null)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile.setup_complete) return <Navigate to="/setup" replace />
  if (profile.seen_intro) return <Navigate to="/calendar" replace />
  return <Welcome />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeGate />} />
      <Route path="/floor-preview" element={<DanceFloorLoader discoMs={99000} label="Cueing the floor" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route path="/setup" element={<SetupGate />} />
      <Route path="/welcome" element={<WelcomeGate />} />
      {/* Shared by link: guests join with a display name, no account. */}
      <Route path="/overlap/:sessionId" element={<OverlapSession />} />

      {/* Protected (shared Nav) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/calendar" element={<Dashboard />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/calendar/add" element={<AddEvent />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/overlap" element={<Overlap />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
