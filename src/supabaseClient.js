import { createClient } from '@supabase/supabase-js'

// The publishable/anon key is safe to expose in client code; RLS enforces access.
// Values must come from .env (VITE_*) -- no baked-in fallback, so a missing
// .env fails loudly instead of silently talking to production.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project values.',
  )
}

export const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
