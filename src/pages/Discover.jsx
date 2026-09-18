import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchTicketmaster, fetchRA, fetchDice, fetchMyArtists, addDiscoveredEvent, startSpotifyConnect } from '../lib/db.js'
import { GridBg, Wrap, Btn, Kicker, SecLabel, HudBox, Spinner, SearchSel } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { openConnect } from '../lib/oauthFlow.js'

const norm = (s) => (s || '').trim().toLowerCase()

const SOURCES = [
  { value: 'all', label: 'All' },
  { value: 'ticketmaster', label: 'Ticketmaster' },
  { value: 'ra', label: 'RA' },
  { value: 'dice', label: 'DICE' },
]

export default function Discover() {
  const { user, profile, refreshProfile } = useAuth()
  // const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [tm, setTm] = useState({ configured: true, events: [] })
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(() => new Set())
  const [connecting, setConnecting] = useState(false)
  const [err, setErr] = useState('')
  const emptyFilters = { source: 'all', venue: '', dateFrom: '', dateUntil: '' }
  // Draft filters track the controls; `applied` only updates when the user
  // hits Go Disco, so nothing re-filters the list mid-edit.
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [view, setView] = useState('list')

  const load = useCallback(() => {
    Promise.all([fetchTicketmaster({}), fetchRA({}), fetchDice({}), fetchMyArtists(user.id)])
      .then(([t, ra, dice, a]) => {
        const tag = (src) => (e) => ({ ...e, source: src, key: `${src}-${e.id}` })
        const merged = [
          ...t.events.map(tag('ticketmaster')),
          ...ra.events.map(tag('ra')),
          ...dice.events.map(tag('dice')),
        ]
        // Some sources (RA in particular) repeat the same event across
        // paginated/overlapping queries — dedupe by source+id so a stray
        // duplicate can't collide on its React key and leave stale cards
        // behind when the list re-filters.
        const seen = new Set()
        const events = merged.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)))
        setTm({ configured: t.configured || ra.configured || dice.configured, events })
        setArtists(a)
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

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

  const venueOptions = useMemo(
    () => [...new Set((tm.events || []).map((e) => e.venue).filter(Boolean))].sort(),
    [tm.events],
  )

  const filtered = useMemo(() => {
    return (tm.events || []).filter((e) => {
      if (applied.source !== 'all' && e.source !== applied.source) return false
      if (applied.venue && e.venue !== applied.venue) return false
      if (applied.dateFrom && e.date < applied.dateFrom) return false
      if (applied.dateUntil && e.date > applied.dateUntil) return false
      return true
    })
  }, [tm.events, applied])

  const dirty =
    draft.source !== applied.source ||
    draft.venue !== applied.venue ||
    draft.dateFrom !== applied.dateFrom ||
    draft.dateUntil !== applied.dateUntil
  const hasFilters = applied.source !== 'all' || applied.venue || applied.dateFrom || applied.dateUntil

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
          <span className="font-mono text-[10px] text-mint flex items-center gap-1">
            <Icon name="check-circle" size={12} /> Added
          </span>
        ) : (
          <Btn variant={highlight ? 'mint' : 'ghost'} onClick={() => add(e)} cls="!px-3 !py-1.5">
            + Add
          </Btn>
        )}
        {e.url && (
          <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[9px] text-slate-500 hover:text-violet text-center underline">
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
              <div className="font-mono text-[9px] text-mint uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <Icon name="heart" size={10} /> {e.matched}
              </div>
            )}
            <div className="font-display font-bold text-sm text-[#e8f4f8] truncate">{e.title}</div>
            <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
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
              <div className="font-mono text-[9px] text-mint uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <Icon name="heart" size={10} /> {e.matched}
              </div>
            )}
            {/* line-clamp (not truncate) -- a single-line cutoff was chopping
                real titles mid-word on narrow screens ("Hayley Williams w/ M..."). */}
            <div className="font-display font-bold text-sm text-[#e8f4f8] line-clamp-2">{e.title}</div>
            <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
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
          <div className="font-mono text-[10px] text-mint mb-5 flex items-center gap-1.5">
            <Icon name="spotify-logo" size={12} /> {profile.spotify_name} · {artists.length} artists tracked
          </div>
        )}

        {!tm.configured && (
          <HudBox className="p-4 mb-6">
            <p className="font-mono text-[11px] text-slate-400">
              Live show discovery isn’t switched on yet. Add a Ticketmaster, RA, or DICE API key to the{' '}
              <span className="text-violet">ticketmaster-events</span> / <span className="text-violet">ra-events</span> / <span className="text-violet">dice-events</span> functions to light this up.
            </p>
          </HudBox>
        )}

        {/* Filters */}
        <HudBox className="p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <SecLabel className="mb-2">Source</SecLabel>
              <div className="flex gap-1 bg-white/[0.04] rounded p-1 w-fit">
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setDraft((d) => ({ ...d, source: s.value }))}
                    className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wide transition-all ${
                      draft.source === s.value ? 'bg-white/10 text-violet' : 'text-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-[200px]">
              <SearchSel
                label="Venue"
                value={draft.venue}
                onChange={(v) => setDraft((d) => ({ ...d, venue: v }))}
                options={venueOptions}
                placeholder="Search venues…"
              />
            </div>

            <div>
              <SecLabel className="mb-2">From</SecLabel>
              <input
                type="date"
                value={draft.dateFrom}
                onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                className="bg-white/[0.045] border border-white/10 rounded px-3 py-3 text-[#e8f4f8] text-sm focus:outline-none focus:border-violet/60 transition-colors"
              />
            </div>
            <div>
              <SecLabel className="mb-2">Until</SecLabel>
              <input
                type="date"
                value={draft.dateUntil}
                onChange={(e) => setDraft((d) => ({ ...d, dateUntil: e.target.value }))}
                className="bg-white/[0.045] border border-white/10 rounded px-3 py-3 text-[#e8f4f8] text-sm focus:outline-none focus:border-violet/60 transition-colors"
              />
            </div>

            <Btn variant="aurora" onClick={applyFilters} disabled={!dirty} cls="!px-5">
              <Icon name="disco-ball" size={14} /> Go Disco
            </Btn>

            {hasFilters && (
              <button onClick={clearFilters} className="font-mono text-[10px] text-slate-500 hover:text-white underline">
                Clear filters
              </button>
            )}
          </div>
        </HudBox>

        {/* View toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex gap-1 bg-white/[0.04] rounded p-1 w-fit">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                view === 'list' ? 'bg-white/10 text-violet' : 'text-slate-600 hover:text-slate-300'
              }`}
            >
              <Icon name="list" size={12} /> List
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wide transition-all flex items-center gap-1.5 ${
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
            <p className="font-mono text-[10px] text-slate-600">
              {tm.configured ? 'No shows found right now.' : 'Discovery is not configured yet.'}
            </p>
          ) : (
            <ShowList items={rest} />
          )}
        </section>
      </Wrap>
    </>
  )
}
