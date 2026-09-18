import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { mfaRedirectPath } from './lib/mfa.js'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { Spinner } from './components/ui.jsx'

import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import MfaEnroll from './pages/MfaEnroll.jsx'
import MfaChallenge from './pages/MfaChallenge.jsx'
import MfaRecover from './pages/MfaRecover.jsx'
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
import DeepLinkHandler from './components/DeepLinkHandler.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import Help from './pages/Help.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'

// Guards the onboarding / profile-edit route: needs auth + satisfied MFA,
// renders full-screen (no Nav). Doubles as the editor once setup is complete.
const SetupGate = () => {
  const { user, profile, loading, mfaStatus } = useAuth()
  const location = useLocation()
  if (loading || mfaStatus === null || (user && profile === null)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  const mfaRedirect = mfaRedirectPath(mfaStatus, location.pathname)
  if (mfaRedirect) return <Navigate to={mfaRedirect} replace />
  return <Setup />
}

// Home: returning/logged-in users start in the app, not on the marketing page.
// Signed-in → MFA gate, then calendar (or setup if onboarding isn't
// finished); everyone else sees the Landing page.
const HomeGate = () => {
  const { user, profile, loading, mfaStatus } = useAuth()
  if (loading || (user && mfaStatus === null) || (user && profile === null)) return <Spinner />
  if (user) {
    const mfaRedirect = mfaRedirectPath(mfaStatus, '/')
    return <Navigate to={mfaRedirect ?? (profile?.setup_complete ? '/calendar' : '/setup')} replace />
  }
  return <Landing />
}

// First-run intro: needs auth + satisfied MFA + completed setup, plays once
// until seen.
const WelcomeGate = () => {
  const { user, profile, loading, mfaStatus } = useAuth()
  if (loading || mfaStatus === null || (user && profile === null)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  const mfaRedirect = mfaRedirectPath(mfaStatus, '/welcome')
  if (mfaRedirect) return <Navigate to={mfaRedirect} replace />
  if (!profile.setup_complete) return <Navigate to="/setup" replace />
  if (profile.seen_intro) return <Navigate to="/calendar" replace />
  return <Welcome />
}

// The MFA routes themselves: reachable only while that exact step is
// outstanding, so a user who's already enrolled/challenged bounces to the app
// instead of re-doing a step that's already satisfied.
const MfaEnrollGate = () => {
  const { user, loading, mfaStatus } = useAuth()
  if (loading || mfaStatus === null) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (mfaStatus !== 'needs-enrollment') return <Navigate to="/" replace />
  return <MfaEnroll />
}

const MfaChallengeGate = () => {
  const { user, loading, mfaStatus } = useAuth()
  if (loading || mfaStatus === null) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (mfaStatus !== 'needs-challenge') return <Navigate to="/" replace />
  return <MfaChallenge />
}

// Only a session established via the recovery-link flow (recoveryEvent) may
// reach the unenroll action -- an ordinary password login (aal1, no TOTP
// device) must not be able to strip MFA off an account it doesn't otherwise
// control.
const MfaRecoverGate = () => {
  const { user, loading, recoveryEvent } = useAuth()
  if (loading) return <Spinner />
  if (!user || !recoveryEvent) return <Navigate to="/login" replace />
  return <MfaRecover />
}

export default function App() {
  return (
    <>
      <DeepLinkHandler />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomeGate />} />
        <Route path="/floor-preview" element={<DanceFloorLoader discoMs={99000} label="Cueing the floor" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/mfa-enroll" element={<MfaEnrollGate />} />
        <Route path="/mfa-challenge" element={<MfaChallengeGate />} />
        <Route path="/mfa-recover" element={<MfaRecoverGate />} />
        <Route path="/setup" element={<SetupGate />} />
        <Route path="/welcome" element={<WelcomeGate />} />
        {/* Static info / legal — public, reachable while logged out. */}
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
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
    </>
  )
}
