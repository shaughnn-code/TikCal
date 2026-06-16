import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { Spinner } from './components/ui.jsx'

import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Setup from './pages/Setup.jsx'
import Welcome from './pages/Welcome.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EventDetail from './pages/EventDetail.jsx'
import AddEvent from './pages/AddEvent.jsx'
import Profile from './pages/Profile.jsx'
import Friends from './pages/Friends.jsx'

// Guards the onboarding / profile-edit route: needs auth, renders full-screen
// (no Nav). Doubles as the editor once setup is complete.
const SetupGate = () => {
  const { user, profile, loading } = useAuth()
  if (loading || (user && profile === null)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return <Setup />
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
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/setup" element={<SetupGate />} />
      <Route path="/welcome" element={<WelcomeGate />} />

      {/* Protected (shared Nav) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/calendar" element={<Dashboard />} />
        <Route path="/calendar/add" element={<AddEvent />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/friends" element={<Friends />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
