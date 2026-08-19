// Shared CORS allow-list for TikCal's Supabase Edge Functions. These functions
// are called with the anon key (bearer token, not cookies), so a wildcard
// origin doesn't leak credentials by itself -- but it does let any website
// replay these calls from a victim's browser. Scope Access-Control-Allow-Origin
// to the app's own origins instead.
const ALLOWED_ORIGINS = new Set([
  'https://tikcal.nyc',
  'capacitor://localhost', // iOS (Capacitor WKWebView)
  'http://localhost', // Android (Capacitor)
  'http://localhost:5173', // local Vite dev
])

// Returns CORS headers for a request. Reflects the request's Origin only if
// it's on the allow-list; otherwise omits Access-Control-Allow-Origin so the
// browser blocks the response.
export function corsHeaders(req: Request, extraMethods = 'POST, OPTIONS') {
  const origin = req.headers.get('Origin') || ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': extraMethods,
    Vary: 'Origin',
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}
