import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchTicketmaster, fetchRA, fetchDice, fetchMyArtists, fetchSubgenreTags, addDiscoveredEvent, startSpotifyConnect } from '../lib/db.js'
import { GridBg, Wrap, Btn, Kicker, SecLabel, HudBox, Spinner, SearchSel } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { openConnect } from '../lib/oauthFlow.js'
import { buildVenueOptions, buildSubgenreOptions, filterEvents, needsJevTag } from '../lib/discoverFilters.js'
import { eventCounts, toISO } from '../lib/dateRange.js'
import DateRangePicker from '../components/DateRangePicker.jsx'

const norm = (s) => (s || '').trim().toLowerCase()

// Each catalog is fetched on its own clock. One slow or dead source used to
// hold the whole page on the loading blob (Promise.all with no timeout).
// RA and DICE are live scrapes (parse.bot) and routinely take far longer than
// Ticketmaster's API; they get a long clock because the page no longer waits
// on them -- their shows just join the list when they land.
const FETCHERS = [
  { key: 'ticketmaster', label: 'Ticketmaster', fetch: fetchTicketmaster, timeoutMs: 12000 },
  { key: 'ra', label: 'RA', fetch: fetchRA, timeoutMs: 60000 },
  { key: 'dice', label: 'DICE', fetch: fetchDice, timeoutMs: 60000 },
]
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((resolve) =>
      setTimeout(() => resolve({ configured: true, events: [], error: 'timed out' }), ms),
    ),
  ])

const SOURCES = [
  { value: 'all', label: 'All' },
  { value: 'ticketmaster', label: 'Ticketmaster' },
  { value: 'ra', label: 'RA' },
  { value: 'dice', label: 'DICE' },
]

export default function Discover() {
  const { user, profile, refreshProfile } = useAuth()
  const [params, setParams] = useSearchParams()

  // Raw { configured, events, error? } per source key, filled in as each lands.
  const [results, setResults] = useState({})
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(() => new Set())
  const [connecting, setConnecting] = useState(false)
  const [err, setErr] = useState('')
  const emptyFilters = { source: 'all', venue: '', subgenre: '', dateFrom: '', dateUntil: '' }
  // Draft filters track the controls; `applied` only updates when the user
  // hits Go Disco, so nothing re-filters the list mid-edit.
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [view, setView] = useState('list')
  // Jev subgenre tags keyed `${source}:${id}`; fills in after the events load.
  const [tags, setTags] = useState({})
  const todayISO = useMemo(() => toISO(new Date()), [])

  // Ask Jev (via the tag-subgenres function) for the subgenre of electronic
  // events the keyword rules can't place. Best effort: events stay usable, just
  // untagged, if this fails or isn't deployed yet. Results are cached server-side.
  // Sources answer one at a time, so this runs as each batch arrives; events
  // already asked about are remembered (at most 300 per page load).
  const askedTags = useRef(new Set())
  const tagInBackground = async (events, isActive) => {
    const need = []
    for (const e of events) {
      const k = `${e.source}:${e.id}`
      if (!needsJevTag(e) || askedTags.current.has(k) || askedTags.current.size + need.length >= 300) continue
      need.push(e)
    }
    need.forEach((e) => askedTags.current.add(`${e.source}:${e.id}`))
    for (let i = 0; i < need.length; i += 100) {
      const got = await fetchSubgenreTags(need.slice(i, i + 100))
      if (!isActive()) return
      if (Object.keys(got).length) setTags((prev) => ({ ...prev, ...got }))
    }
  }

  useEffect(() => {
    let active = true
    fetchMyArtists(user.id).then((list) => active && setArtists(list))
    for (const f of FETCHERS) {
      withTimeout(f.fetch({}), f.timeoutMs).then((res) => {
        if (!active) return
        setResults((prev) => ({ ...prev, [f.key]: res }))
        // Show the page as soon as any source has answered; the rest fill in.
        setLoading(false)
      })
    }
    return () => {
      active = false
    }
  }, [user.id])

  const tm = useMemo(() => {
    const merged = FETCHERS.flatMap((f) =>
      (results[f.key]?.events || []).map((e) => ({ ...e, source: f.key, key: `${f.key}-${e.id}` })),
    )
    // Some sources (RA in particular) repeat the same event across
    // paginated/overlapping queries — dedupe by source+id so a stray
    // duplicate can't collide on its React key and leave stale cards
    // behind when the list re-filters.
    const seen = new Set()
    const events = merged.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)))
    const settled = FETCHERS.filter((f) => results[f.key])
    return {
      // Until something answers, assume configured so the setup notice doesn't flash.
      configured: settled.length === 0 || settled.some((f) => results[f.key].configured),
      events,
    }
  }, [results])

  useEffect(() => {
    let active = true
    tagInBackground(tm.events, () => active)
    return () => {
      active = false
    }
  }, [tm.events])

  const waitingOn = FETCHERS.filter((f) => !results[f.key]).map((f) => f.label)
  const failed = FETCHERS.filter((f) => results[f.key]?.error).map((f) => `${f.label}: ${results[f.key].error}`)

  // Return from Spotify OAuth (…/discover?spotify=connected|denied|error).
  useEffect(() => {
    const s = params.get('spotify')
    if (!s) return
    if (s === 'connected') refreshProfile?.()
    else setErr(s === 'denied' ? 'Spotify connection was cancelled.' : 'Spotify connection failed — try again.')
    params.delete('spotify')
    setParams(params, { replace: true })
  }, [params, refreshProfile, setParams])

  const artistSet = useMemo(() => new Set(artists.map((a) => a.artist_norm)), [artists])
  const spotifyOn = !!profile?.spotify_name

  // Events with their Jev subgenre tag attached (when there is one).
  const allEvents = useMemo(
    () =>
      (tm.events || []).map((e) => {
        const t = tags[`${e.source}:${e.id}`]
        return t ? { ...e, jevSubgenre: t.subgenre } : e
      }),
    [tm.events, tags],
  )

  // Venue and subgenre choices come from the events in the selected source,
  // so the lists never offer something that would return nothing.
  const sourceEvents = useMemo(
    () => (draft.source === 'all' ? allEvents : allEvents.filter((e) => e.source === draft.source)),
    [allEvents, draft.source],
  )
  const dayCounts = useMemo(() => eventCounts(sourceEvents), [sourceEvents])
  const venueOptions = useMemo(() => buildVenueOptions(sourceEvents).map((v) => v.label), [sourceEvents])
  const subgenreOptions = useMemo(() => buildSubgenreOptions(sourceEvents), [sourceEvents])

  const filtered = useMemo(() => filterEvents(allEvents, applied), [allEvents, applied])

  const dirty =
    draft.source !== applied.source ||
    draft.venue !== applied.venue ||
    draft.subgenre !== applied.subgenre ||
    draft.dateFrom !== applied.dateFrom ||
    draft.dateUntil !== applied.dateUntil
  const hasFilters = applied.source !== 'all' || applied.venue || applied.subgenre || applied.dateFrom || applied.dateUntil

  const applyFilters = () => setApplied(draft)
  const clearFilters = () => {
    setDraft(emptyFilters)
    setApplied(emptyFilters)
  }

  const { forYou, rest } = useMemo(() => {
    const matchOf = (e) => {
      const names = e.attractions?.length ? e.attractions : e.artist ? e.artist.split(',') : []
      return names.map(norm).find((n) => artistSet.has(n)) || null
    }
    const forYou = []
    const rest = []
    for (const e of filtered) {
      const m = matchOf(e)
      if (m) forYou.push({ ...e, matched: m })
      else rest.push(e)
    }
    return { forYou, rest }
  }, [filtered, artistSet])

  const connectSpotify = async () => {
    setConnecting(true)
    setErr('')
    try {
      if (await openConnect(startSpotifyConnect)) setConnecting(false)
    } catch (e) {
      setErr(e.message || 'Could not start the Spotify connection.')
      setConnecting(false)
    }
  }

  const add = async (e) => {
    const { error } = await addDiscoveredEvent(user.id, e)
    if (error) return setErr(error.message)
    setAdded((prev) => new Set(prev).add(e.id))
  }

  if (loading) return <Spinner />

  const fmtDate = (d) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const Show = ({ e, highlight, tile }) => {
    const img = e.image ? (
      <img
        src={e.image}
        alt=""
        className={tile ? 'w-full h-32 rounded object-cover border border-white/10' : 'w-14 h-14 rounded object-cover shrink-0 border border-white/10'}
      />
    ) : (
      <div
        className={
          tile
            ? 'w-full h-32 rounded bg-white/5 flex items-center justify-center'
            : 'w-14 h-14 rounded bg-white/5 flex items-center justify-center shrink-0'
        }
      >
        <Icon name="music-notes" size={tile ? 28 : 20} className="text-slate-600" />
      </div>
    )

    const actions = (
      <div className={tile ? 'flex items-center justify-between gap-2 mt-2' : 'flex items-center gap-3'}>
        {added.has(e.id) ? (
          <span className="font-mono text-[11px] text-mint flex items-center gap-1">
            <Icon name="check-circle" size={12} /> Added
          </span>
        ) : (
          <Btn variant={highlight ? 'mint' : 'ghost'} onClick={() => add(e)} cls="!px-3 !py-1.5">
            + Add
          </Btn>
        )}
        {e.url && (
          <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-slate-500 hover:text-violet text-center underline">
            Tickets
          </a>
        )}
      </div>
    )

    if (tile) {
      return (
        <HudBox tone={highlight ? 'mint' : 'ice'} className="p-3 flex flex-col">
          {img}
          <div className="min-w-0 mt-2">
            {highlight && e.matched && (
              <div className="font-mono text-[11px] text-mint uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <Icon name="heart" size={10} /> {e.matched}
              </div>
            )}
            <div className="font-display font-bold text-sm text-[#e8f4f8] truncate">{e.title}</div>
            <div className="font-mono text-[11px] text-slate-400 truncate mt-0.5">
              {fmtDate(e.date)}
              {e.venue && <span className="text-slate-700"> · </span>}
              {e.venue}
            </div>
          </div>
          {actions}
        </HudBox>
      )
    }

    return (
      <HudBox tone={highlight ? 'mint' : 'ice'} className="p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          {img}
          <div className="flex-1 min-w-0">
            {highlight && e.matched && (
              <div className="font-mono text-[11px] text-mint uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <Icon name="heart" size={10} /> {e.matched}
              </div>
            )}
            {/* line-clamp (not truncate) -- a single-line cutoff was chopping
                real titles mid-word on narrow screens ("Hayley Williams w/ M..."). */}
            <div className="font-display font-bold text-sm text-[#e8f4f8] line-clamp-2">{e.title}</div>
            <div className="font-mono text-[11px] text-slate-400 truncate mt-0.5">
              {fmtDate(e.date)}
              {e.venue && <span className="text-slate-700"> · </span>}
              {e.venue}
            </div>
          </div>
        </div>
        {actions}
      </HudBox>
    )
  }

  const ShowList = ({ items }) => (
    <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
      {items.map((e) => (
        <Show key={e.key} e={e} highlight={e.matched != null} tile={view === 'grid'} />
      ))}
    </div>
  )

  return (
    <>
      <GridBg lite />
      <Wrap>
        <Kicker className="mb-1">// DISCOVER</Kicker>
        <h1 className="font-display font-extrabold text-xl uppercase text-[#e8f4f8] mb-2">Shows for you</h1>
        <p className="text-slate-400 text-sm mb-5 leading-relaxed">
          Upcoming NYC shows — with the artists you actually listen to floated to the top.
        </p>

        {err && <p className="text-red-400 text-xs mb-4">{err}</p>}
        {waitingOn.length > 0 && (
          <p className="font-mono text-[11px] text-slate-500 mb-4" role="status">Still loading {waitingOn.join(', ')}…</p>
        )}
        {failed.length > 0 && (
          <p className="font-mono text-[11px] text-amber-400/80 mb-4">Couldn’t load {failed.join(' · ')}</p>
        )}

        {/* Spotify connect / status */}
        {!spotifyOn ? (
          <HudBox tone="mint" className="p-4 mb-6">
            <SecLabel className="mb-2 flex items-center gap-1.5">
              <Icon name="spotify-logo" size={13} className="text-mint" /> Connect Spotify
            </SecLabel>
            <p className="text-slate-400 text-xs mb-3 leading-relaxed">
              Link Spotify and we’ll highlight shows by the artists you love, right here.
            </p>
            <Btn variant="mint" onClick={connectSpotify} disabled={connecting}>
              {connecting ? 'Opening Spotify…' : 'Connect Spotify'}
            </Btn>
          </HudBox>
        ) : (
          <div className="font-mono text-[11px] text-mint mb-5 flex items-center gap-1.5">
            <Icon name="spotify-logo" size={12} /> {profile.spotify_name} · {artists.length} artists tracked
          </div>
        )}

        {!tm.configured && (
          <HudBox className="p-4 mb-6">
            <p className="text-slate-400 text-sm leading-relaxed">
              Show discovery is unavailable right now. Check back in a bit.
            </p>
          </HudBox>
        )}

        {/* Filters. z-20 keeps the date popover above the event cards below. */}
        <HudBox className="p-4 mb-6 z-20">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <SecLabel className="mb-2">Source</SecLabel>
              <div className="flex gap-1 bg-white/[0.04] rounded p-1 w-fit">
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setDraft((d) => ({ ...d, source: s.value }))}
                    className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-wide transition-all ${
                      draft.source === s.value ? 'bg-white/10 text-violet' : 'text-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <SearchSel
                label="Venue"
                value={draft.venue}
                onChange={(v) => setDraft((d) => ({ ...d, venue: v }))}
                options={venueOptions}
                placeholder="Search venues…"
              />
            </div>

            <DateRangePicker
              from={draft.dateFrom}
              until={draft.dateUntil}
              counts={dayCounts}
              todayISO={todayISO}
              onChange={({ from, until }) => setDraft((d) => ({ ...d, dateFrom: from, dateUntil: until }))}
            />

            <Btn variant="aurora" onClick={applyFilters} disabled={!dirty} cls="!px-5">
              <Icon name="disco-ball" size={14} /> Go Disco
            </Btn>

            {hasFilters && (
              <button onClick={clearFilters} className="font-mono text-[11px] text-slate-500 hover:text-white underline">
                Clear filters
              </button>
            )}
          </div>

          {subgenreOptions.length > 0 && (
            <div className="mt-4">
              <SecLabel className="mb-2">Subgenre</SecLabel>
              <div className="flex flex-wrap gap-1.5">
                {[{ value: '', label: 'Any' }, ...subgenreOptions].map((s) => (
                  <button
                    key={s.value || 'any'}
                    onClick={() => setDraft((d) => ({ ...d, subgenre: s.value }))}
                    className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wide transition-all border ${
                      draft.subgenre === s.value
                        ? 'bg-white/10 text-violet border-violet/40'
                        : 'text-slate-500 border-white/10 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                    {s.count != null && <span className="text-slate-600"> {s.count}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </HudBox>

        {/* View toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex gap-1 bg-white/[0.04] rounded p-1 w-fit">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                view === 'list' ? 'bg-white/10 text-violet' : 'text-slate-600 hover:text-slate-300'
              }`}
            >
              <Icon name="list" size={12} /> List
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                view === 'grid' ? 'bg-white/10 text-violet' : 'text-slate-600 hover:text-slate-300'
              }`}
            >
              <Icon name="squares-four" size={12} /> Grid
            </button>
          </div>
        </div>

        {forYou.length > 0 && (
          <section className="mb-8">
            <SecLabel className="mb-3 text-mint">▸ For you · {forYou.length}</SecLabel>
            <ShowList items={forYou} />
          </section>
        )}

        <section>
          <SecLabel className="mb-3">▸ All NYC shows{rest.length ? ` · ${rest.length}` : ''}</SecLabel>
          {rest.length === 0 && forYou.length === 0 ? (
            <p className="font-mono text-[11px] text-slate-600">
              {waitingOn.length ? 'Loading shows…' : 'No shows found right now.'}
            </p>
          ) : (
            <ShowList items={rest} />
          )}
        </section>
      </Wrap>
    </>
  )
}
