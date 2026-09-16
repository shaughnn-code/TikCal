// Pure MFA-gate decision, kept separate from the Supabase calls that feed it
// (auth.jsx) so ProtectedRoute can be tested without network I/O.
export function mfaGateStatus({ verifiedFactorCount, currentLevel, nextLevel }) {
  if (verifiedFactorCount === 0) return 'needs-enrollment'
  if (currentLevel !== nextLevel) return 'needs-challenge'
  return 'ok'
}

// Where an auth gate (ProtectedRoute, SetupGate, ...) should send the user
// given their mfaStatus and current path, or null to let them through.
export function mfaRedirectPath(mfaStatus, pathname) {
  if (mfaStatus === 'needs-enrollment' && pathname !== '/mfa-enroll') return '/mfa-enroll'
  if (mfaStatus === 'needs-challenge' && pathname !== '/mfa-challenge') return '/mfa-challenge'
  return null
}
