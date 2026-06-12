import { createClient } from '@supabase/supabase-js'

// The publishable/anon key is safe to expose in client code; RLS enforces access.
// Values come from .env (VITE_*) with a fallback so the app works out of the box.
const url =
  import.meta.env.VITE_SUPABASE_URL || 'https://pirlflebmiylgusmqhhk.supabase.co'
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_1dc1bPeuxhOzWJ9EuPwPCA_o0-KTjmd'

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
