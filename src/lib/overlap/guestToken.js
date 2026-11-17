// Guest secret for a Sync session. join_session() hands a guest a random token
// once; it is the only thing that lets that guest edit their row later. Pure:
// every function takes the storage object (localStorage in the app), so tests
// can pass a stub.
//
// Before 20261110130000_overlap_guest_tokens.sql, guests stored their
// participant id under `overlap:guest:<id>`. Those ids were never secret, so
// they no longer authorize anything; the legacy key only tells us to ask that
// guest to join again.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const tokenKey = (sessionId) => `overlap:guest-token:${sessionId}`
export const legacyKey = (sessionId) => `overlap:guest:${sessionId}`

const safe = (fn, fallback) => {
  try { return fn() } catch { return fallback } // private mode / storage blocked
}

// The stored token, or null if missing or malformed.
export function readGuestToken(storage, sessionId) {
  const v = safe(() => storage?.getItem(tokenKey(sessionId)), null)
  return typeof v === 'string' && UUID_RE.test(v) ? v : null
}

// Save a token and drop any legacy participant-id entry for the session.
export function writeGuestToken(storage, sessionId, token) {
  if (!token || !UUID_RE.test(String(token))) return false
  return safe(() => {
    storage.setItem(tokenKey(sessionId), String(token))
    storage.removeItem(legacyKey(sessionId))
    return true
  }, false)
}

export function clearGuestToken(storage, sessionId) {
  safe(() => storage?.removeItem(tokenKey(sessionId)), undefined)
}

// True when this browser joined as a guest under the old scheme and has no
// token yet: that guest must join again to edit.
export function hasLegacyGuest(storage, sessionId) {
  if (readGuestToken(storage, sessionId)) return false
  return !!safe(() => storage?.getItem(legacyKey(sessionId)), null)
}

// The caller's own row, as marked by the server.
export const findMe = (participants) => (participants || []).find((p) => p?.is_me) || null
