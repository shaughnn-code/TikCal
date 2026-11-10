// Shared request handler for the cached parse.bot discovery sources
// (ra-events, dice-events). Find reads rows from public.discovery_cache;
// parse.bot is only hit when the cache is stale, at most once per
// RETRY_AFTER_MS, with a hard server-side timeout. See discoveryCache.js for
// the policy and the reasons behind the numbers.
//
// Only the default NYC query is cached. Request-body params are ignored on
// purpose: letting them through would create uncached keys that spend
// credits on every call.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'
import {
  MISS_WAIT_MS,
  UPSTREAM_TIMEOUT_MS,
  claimCutoff,
  nycToday,
  planCache,
  upcomingOnly,
} from './discoveryCache.js'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

type Ev = Record<string, unknown> & { date?: string }

export type SourceConfig = {
  source: 'ra' | 'dice'
  keyEnv: string
  // Full upstream URL for the default NYC query, built at refresh time.
  url: () => string
  // deno-lint-ignore no-explicit-any
  map: (payload: any) => Ev[]
}

export function serveDiscovery(cfg: SourceConfig) {
  Deno.serve(async (req) => {
    const cors = corsHeaders(req)
    const json = (b: unknown, status = 200) =>
      new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

    const key = Deno.env.get(cfg.keyEnv)
    if (!key) return json({ configured: false, events: [] })

    // Require a signed-in caller so the key isn't a public proxy.
    const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return json({ error: 'Not signed in.' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const table = () => admin.from('discovery_cache')
    const started = Date.now()
    const log = (fields: Record<string, unknown>) =>
      console.log(JSON.stringify({ fn: `${cfg.source}-events`, duration_ms: Date.now() - started, ...fields }))

    const { data: row, error: readErr } = await table()
      .select('events, fetched_at, attempted_at, last_error')
      .eq('source', cfg.source)
      .maybeSingle()
    if (readErr) {
      log({ cache: 'error', error: readErr.message })
      return json({ configured: true, events: [], error: 'cache unavailable' })
    }
    if (!row) {
      // Seeded by the migration; recreate if someone deleted it.
      await table().upsert({ source: cfg.source }, { onConflict: 'source', ignoreDuplicates: true })
    }

    const plan = planCache(row)
    const today = nycToday()
    const cached = upcomingOnly((row?.events as Ev[]) || [], today)
    const respond = (events: Ev[], extra: Record<string, unknown> = {}) =>
      json({ configured: true, events, cachedAt: row?.fetched_at || null, stale: plan.status !== 'hit', ...extra })

    // Single-flight + failure backoff in one statement: only a caller whose
    // UPDATE matches the row (last attempt older than the cutoff) may scrape.
    let claimed = false
    if (plan.refresh) {
      const { data: won } = await table()
        .update({ attempted_at: new Date().toISOString() })
        .eq('source', cfg.source)
        .or(`attempted_at.is.null,attempted_at.lt."${claimCutoff()}"`)
        .select('source')
      claimed = !!won?.length
    }

    const refresh = async (): Promise<{ events?: Ev[]; error?: string }> => {
      const t0 = Date.now()
      let upstream: number | null = null
      try {
        const res = await fetch(cfg.url(), {
          headers: { 'X-API-Key': key },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })
        upstream = res.status
        if (!res.ok) throw new Error(`${cfg.source} ${res.status}`)
        const events = cfg.map(await res.json())
        // NYC always has shows; an empty list means a bad scrape, so keep
        // the last good rows instead of overwriting them with [].
        if (!events.length) throw new Error(`${cfg.source} returned no events`)
        await table()
          .update({ events, fetched_at: new Date().toISOString(), last_error: null })
          .eq('source', cfg.source)
        log({ cache: plan.status, refresh: 'ok', upstream_status: upstream, upstream_ms: Date.now() - t0, count: events.length })
        return { events }
      } catch (err) {
        const msg = err instanceof DOMException && err.name === 'TimeoutError'
          ? `${cfg.source} upstream timed out after ${UPSTREAM_TIMEOUT_MS / 1000}s`
          : String(err instanceof Error ? err.message : err)
        await table().update({ last_error: msg }).eq('source', cfg.source)
        log({ cache: plan.status, refresh: 'failed', upstream_status: upstream, upstream_ms: Date.now() - t0, error: msg })
        return { error: msg }
      }
    }

    if (plan.status !== 'miss') {
      // Serve what we have now; refresh behind the response if it's due.
      if (claimed) {
        const p = refresh()
        if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(p)
        else await p
      } else {
        log({ cache: plan.status, refresh: plan.refresh ? 'lost-claim' : 'none' })
      }
      return respond(cached)
    }

    // Nothing cached yet: only the claim winner scrapes. It waits up to
    // MISS_WAIT_MS; past that it answers "warming up" while the scrape keeps
    // running in the background and fills the cache for the next visit.
    if (!claimed) {
      log({ cache: 'miss', refresh: plan.refresh ? 'lost-claim' : 'backoff', last_error: row?.last_error || null })
      return respond([], { error: row?.last_error || 'warming up, try again shortly' })
    }
    const p = refresh()
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(p)
    const out = await Promise.race([
      p,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), MISS_WAIT_MS)),
    ])
    if (!out) return respond([], { error: 'warming up, try again shortly' })
    if (out.error) return respond([], { error: out.error })
    return json({ configured: true, events: upcomingOnly(out.events!, today), cachedAt: new Date().toISOString(), stale: false })
  })
}
