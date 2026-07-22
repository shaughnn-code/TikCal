import { Capacitor } from '@capacitor/core'

// Where the app is *actually* served from differs by platform: the web build
// runs on tikcal.nyc (or localhost in dev), iOS renders at capacitor://localhost
// and Android at https://localhost. Those native origins are real to the
// WebView but meaningless to anyone else — mail them to a user and the link is
// dead, paste one into a chat and nobody can open it.
//
// So: anything that leaves the device gets built from `publicUrl`, never from
// window.location.

export const WEB_ORIGIN = 'https://tikcal.nyc'

// Custom URL scheme the native apps register, used to hand control back after a
// flow that had to leave the app (OAuth consent). Mirrored in the iOS
// Info.plist, the Android manifest, and the OAuth callback edge functions —
// change it in all four or deep links break.
export const APP_SCHEME = 'tikcal'

export const isNative = () => Capacitor.isNativePlatform()

// 'ios' | 'android' | 'web'
export const platform = () => Capacitor.getPlatform()

// Join an origin and a path with exactly one slash between them.
export const joinUrl = (origin, path = '') => {
  const base = String(origin).replace(/\/+$/, '')
  const rest = String(path ?? '').replace(/^\/+/, '')
  return rest ? `${base}/${rest}` : base
}

// Origin for links other people will open. On the web this stays wherever we're
// running, so dev and preview deploys keep producing clickable links; on native
// there is no useful current origin, so it's always the real site.
export const publicOrigin = () => (isNative() ? WEB_ORIGIN : window.location.origin)

// Absolute URL for a route — safe to email, copy, or share.
export const publicUrl = (path) => joinUrl(publicOrigin(), path)

// Map an inbound deep link to an in-app route, or null if it isn't one of ours.
// Accepts both the custom scheme (tikcal://profile?google=connected) and the
// https form, so this keeps working unchanged when universal links land.
export const routeFromDeepLink = (raw) => {
  let u
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  let path
  if (u.protocol === `${APP_SCHEME}:`) {
    // Non-special scheme: tikcal://profile puts "profile" in the host, and
    // tikcal://overlap/abc splits across host + pathname.
    path = `/${u.hostname}${u.pathname}`
  } else if (u.origin === WEB_ORIGIN) {
    path = u.pathname
  } else {
    return null
  }
  return `${path.replace(/\/+$/, '') || '/'}${u.search}${u.hash}`
}
