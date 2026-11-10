// The RA / DICE cache policy lives with the edge functions (Deno can't import
// from src/ at deploy time). Re-exported here so it's tested with the rest of
// src/lib.
export * from '../../supabase/functions/_shared/discoveryCache.js'
