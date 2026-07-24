// Loader for Spotify's embed ("IFrame") API.
//
// The awkward part: that API is a *page* global, not a module. Loading its
// script causes it to call `window.onSpotifyIframeApiReady(IFrameAPI)` exactly
// once per page load, and never again. In an SPA the second <SpotifyPreview>
// to mount is usually a route change later — long after the callback fired —
// so anything that naively waits on the global hangs forever.
//
// Hence this module: inject the script once, capture the IFrameAPI object the
// first (and only) time it is handed to us, and give every later caller that
// same cached object. React 18 StrictMode mounts effects twice in dev, which
// makes the double-injection guard load-bearing rather than defensive.

const SCRIPT_SRC = 'https://open.spotify.com/embed/iframe-api/v1'

// If the script is blocked (offline, ad-blocker, CSP) neither `load` nor
// `error` is guaranteed to fire in a useful window, so callers would sit in a
// permanent loading state. Bound the wait instead.
const READY_TIMEOUT_MS = 10_000

let cachedApi = null // the IFrameAPI object, once it has arrived
let apiPromise = null // in-flight load; cleared on failure so a retry is possible
let scriptEl = null // guards double-injection
let hookInstalled = false
let waiters = [] // settle callbacks fed by the one-shot global

// Fan the one global callback out to everyone currently waiting.
const drain = (api, err) => {
  const pending = waiters
  waiters = []
  for (const settle of pending) settle(api, err)
}

const installReadyHook = () => {
  if (hookInstalled) return
  hookInstalled = true
  // Something else may have claimed the global first (another embed widget, a
  // stale HMR module). Chaining rather than assigning keeps their listener
  // alive — clobbering it would break them silently and only in production.
  const prior = typeof window.onSpotifyIframeApiReady === 'function' ? window.onSpotifyIframeApiReady : null
  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    cachedApi = IFrameAPI
    drain(IFrameAPI, null)
    if (prior) prior(IFrameAPI)
  }
}

const injectScript = () => {
  if (scriptEl) return
  // A tag may already exist from a previous module instance (HMR) or from
  // index.html; adopt it rather than loading the API twice.
  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
  if (existing) {
    scriptEl = existing
    return
  }
  const el = document.createElement('script')
  el.src = SCRIPT_SRC
  el.async = true
  el.addEventListener('error', () => {
    // Drop the node and the reference so a later mount gets a genuine second
    // attempt (e.g. the user came back online) instead of silently timing out.
    scriptEl = null
    el.remove()
    drain(null, new Error('Spotify IFrame API failed to load'))
  })
  scriptEl = el
  document.head.appendChild(el)
}

/**
 * Resolve with Spotify's IFrameAPI object, loading its script on first call.
 * Every subsequent call resolves with the same cached object.
 *
 * @returns {Promise<{ createController: Function }>}
 */
export function loadSpotifyIframeApi() {
  // SSR / test environments have no document to attach a script to. Rejecting
  // (rather than throwing) keeps the call site a plain `.catch`.
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Spotify IFrame API requires a browser environment'))
  }
  if (cachedApi) return Promise.resolve(cachedApi)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve, reject) => {
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      apiPromise = null // allow a retry; the script may yet land and fill cachedApi
      reject(new Error('Spotify IFrame API timed out'))
    }, READY_TIMEOUT_MS)

    // Stays in `waiters` even after a timeout — the `settled` flag makes the
    // late call a no-op, which is cheaper than splicing it back out.
    waiters.push((api, err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err) {
        apiPromise = null
        reject(err)
      } else {
        resolve(api)
      }
    })

    installReadyHook()
    injectScript()
  })

  return apiPromise
}
