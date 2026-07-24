import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchTicketmaster, fetchMyArtists, addDiscoveredEvent, startSpotifyConnect } from '../lib/db.js'
import { GridBg, Wrap, Btn, Kicker, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import SpotifyPreview from '../components/SpotifyPreview.jsx'
import { openConnect } from '../lib/oauthFlow.js'

const norm = (s) => (s || '').trim().toLowerCase()

const fmtDate = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// One event row. Lives at module scope so a re-render of Discover doesn't remount
// the rows — an open Spotify embed must survive unrelated state changes.
const Show = ({ e, highlight, isAdded, onAdd, artistId, open, onToggle }) => (
  <HudBox tone={highlight ? 'mint' : 'ice'} className="p-3">
    <div className="flex items-center gap-3">
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
        {isAdded ? (
          <span className="font-mono text-[10px] text-mint flex items-center gap-1">
            <Icon name="check-circle" size={12} /> Added
          </span>
        ) : (
          <Btn variant={highlight ? 'mint' : 'ghost'} onClick={() => onAdd(e)} cls="!px-3 !py-1.5">
            + Add
          </Btn>
        )}
        {e.url && (
          <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[9px] text-slate-500 hover:text-violet text-center underline">
            Tickets
          </a>
        )}
      </div>
    </div>

    {artistId && (
      <>
        <button
          type="button"
          onClick={() => onToggle(e.id)}
          aria-expanded={open}
          aria-controls={open ? `preview-${e.id}` : undefined}
          aria-label={open ? `Hide Spotify preview for ${e.matched}` : `Preview ${e.matched} on Spotify`}
          className="mt-2 -ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mint/60 transition-colors hover:text-mint focus:outline-none focus-visible:text-mint focus-visible:ring-1 focus-visible:ring-mint/60"
        >
          <Icon name={open ? 'caret-down' : 'caret-right'} size={10} />
          {open ? 'Hide' : 'Preview'}
        </button>
        {open && (
          <div id={`preview-${e.id}`} className="mt-2">
            <SpotifyPreview uri={`spotify:artist:${artistId}`} />
          </div>
        )}
      </>
    )}
  </HudBox>
)

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
  // id of the single row whose artist preview is expanded (null = none open).
  const [openPreview, setOpenPreview] = useState(null)

  const load = useCallback(() => {
    Promise.all([fetchTicketmaster({}), fetchMyArtists(user.id)])
      .then(([t, a]) => {
        setTm(t)
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
  // artist_norm → Spotify artist id. Rows with a null artist_id are omitted, so a
  // miss here means "no preview available".
  const artistIds = useMemo(() => {
    const m = new Map()
    for (const a of artists) if (a.artist_id) m.set(a.artist_norm, a.artist_id)
    return m
  }, [artists])
  const spotifyOn = !!profile?.spotify_name

  const { forYou, rest } = useMemo(() => {
    const matchOf = (e) => {
      const names = e.attractions?.length ? e.attractions : e.artist ? e.artist.split(',') : []
      return names.map(norm).find((n) => artistSet.has(n)) || null
    }
    const forYou = []
    const rest = []
    for (const e of tm.events || []) {
      const m = matchOf(e)
      if (m) forYou.push({ ...e, matched: m })
      else rest.push(e)
    }
    return { forYou, rest }
  }, [tm.events, artistSet])

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

  // Only one preview open at a time — opening another unmounts the previous embed.
  const togglePreview = (id) => setOpenPreview((cur) => (cur === id ? null : id))

  if (loading) return <Spinner />

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
              Live show discovery isn’t switched on yet. Add a Ticketmaster API key to the{' '}
              <span className="text-violet">ticketmaster-events</span> function to light this up.
            </p>
          </HudBox>
        )}

        {forYou.length > 0 && (
          <section className="mb-8">
            <SecLabel className="mb-3 text-mint">▸ For you · {forYou.length}</SecLabel>
            <div className="space-y-2">
              {forYou.map((e) => (
                <Show
                  key={e.id}
                  e={e}
                  highlight
                  isAdded={added.has(e.id)}
                  onAdd={add}
                  artistId={artistIds.get(e.matched) || null}
                  open={openPreview === e.id}
                  onToggle={togglePreview}
                />
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
                <Show key={e.id} e={e} isAdded={added.has(e.id)} onAdd={add} />
              ))}
            </div>
          )}
        </section>
      </Wrap>
    </>
  )
}
