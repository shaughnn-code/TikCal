import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchTicketmaster, fetchRA, fetchDice, fetchMyArtists, addDiscoveredEvent, startSpotifyConnect } from '../lib/db.js'
import { GridBg, Wrap, Btn, Kicker, SecLabel, HudBox, Spinner, Sel } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'

const norm = (s) => (s || '').trim().toLowerCase()

const SOURCES = [
  { value: 'all', label: 'All' },
  { value: 'ticketmaster', label: 'Ticketmaster' },
  { value: 'ra', label: 'RA' },
  { value: 'dice', label: 'DICE' },
]

export default function Discover() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [tm, setTm] = useState({ configured: true, events: [] })
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(() => new Set())
  const [connecting, setConnecting] = useState(false)
  const [err, setErr] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [venueFilter, setVenueFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateUntil, setDateUntil] = useState('')

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
      if (sourceFilter !== 'all' && e.source !== sourceFilter) return false
      if (venueFilter && e.venue !== venueFilter) return false
      if (dateFrom && e.date < dateFrom) return false
      if (dateUntil && e.date > dateUntil) return false
      return true
    })
  }, [tm.events, sourceFilter, venueFilter, dateFrom, dateUntil])

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
      window.location.href = await startSpotifyConnect()
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

  const Show = ({ e, highlight }) => (
    <HudBox tone={highlight ? 'mint' : 'ice'} className="p-3 flex items-center gap-3">
      {e.image ? (
        <img src={e.image} alt="" className="w-14 h-14 rounded object-cover shrink-0 border border-white/10" />
      ) : (
        <div className="w-14 h-14 rounded bg-white/5 flex items-center justify-center shrink-0">
          <Icon name="music-notes" size={20} className="text-slate-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
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
      <div className="flex flex-col gap-1 shrink-0">
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
    </HudBox>
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
                    onClick={() => setSourceFilter(s.value)}
                    className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wide transition-all ${
                      sourceFilter === s.value ? 'bg-white/10 text-violet' : 'text-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-[160px]">
              <Sel label="Venue" value={venueFilter} onChange={setVenueFilter} options={venueOptions} />
            </div>

            <div>
              <SecLabel className="mb-2">From</SecLabel>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/[0.045] border border-white/10 rounded px-3 py-3 text-[#e8f4f8] text-sm focus:outline-none focus:border-violet/60 transition-colors"
              />
            </div>
            <div>
              <SecLabel className="mb-2">Until</SecLabel>
              <input
                type="date"
                value={dateUntil}
                onChange={(e) => setDateUntil(e.target.value)}
                className="bg-white/[0.045] border border-white/10 rounded px-3 py-3 text-[#e8f4f8] text-sm focus:outline-none focus:border-violet/60 transition-colors"
              />
            </div>

            {(sourceFilter !== 'all' || venueFilter || dateFrom || dateUntil) && (
              <button
                onClick={() => { setSourceFilter('all'); setVenueFilter(''); setDateFrom(''); setDateUntil('') }}
                className="font-mono text-[10px] text-slate-500 hover:text-white underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </HudBox>

        {forYou.length > 0 && (
          <section className="mb-8">
            <SecLabel className="mb-3 text-mint">▸ For you · {forYou.length}</SecLabel>
            <div className="space-y-2">
              {forYou.map((e) => (
                <Show key={e.key} e={e} highlight />
              ))}
            </div>
          </section>
        )}

        <section>
          <SecLabel className="mb-3">▸ All NYC shows{rest.length ? ` · ${rest.length}` : ''}</SecLabel>
          {rest.length === 0 && forYou.length === 0 ? (
            <p className="font-mono text-[10px] text-slate-600">
              {tm.configured ? 'No shows found right now.' : 'Discovery is not configured yet.'}
            </p>
          ) : (
            <div className="space-y-2">
              {rest.map((e) => (
                <Show key={e.key} e={e} />
              ))}
            </div>
          )}
        </section>
      </Wrap>
    </>
  )
}
