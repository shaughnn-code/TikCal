import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { getInboxToken, getFeedToken, rotateFeedToken, feedUrls, startGoogleConnect, disconnectGoogle } from '../lib/db.js'
import { GridBg, Wrap, Btn, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon, Totem } from '../components/icons.jsx'
import { totemByIcon } from '../lib/constants.js'

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [events, setEvents] = useState(null)
  const [copied, setCopied] = useState(false)
  const [inboxToken, setInboxToken] = useState(null)
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [feedToken, setFeedToken] = useState(null)
  const [copiedFeed, setCopiedFeed] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [gErr, setGErr] = useState('')

  useEffect(() => {
    supabase
      .from('events')
      .select('event_date, venue')
      .eq('owner_id', user.id)
      .then(({ data }) => setEvents(data || []))
    getInboxToken(user.id).then(setInboxToken).catch(() => {})
    getFeedToken(user.id).then(setFeedToken).catch(() => {})
  }, [user.id])

  // Handle the return from Google OAuth (…/profile?google=connected|denied|error).
  useEffect(() => {
    const g = params.get('google')
    if (!g) return
    if (g === 'connected') refreshProfile?.()
    else setGErr(g === 'denied' ? 'Google connection was cancelled.' : 'Google connection failed — try again.')
    params.delete('google')
    setParams(params, { replace: true })
  }, [params, refreshProfile, setParams])

  const connectGoogle = async () => {
    setConnecting(true)
    setGErr('')
    try {
      window.location.href = await startGoogleConnect()
    } catch (e) {
      setGErr(e.message || 'Could not start the Google connection.')
      setConnecting(false)
    }
  }
  const unlinkGoogle = async () => {
    await disconnectGoogle(user.id)
    refreshProfile?.()
  }
  const rotateFeed = async () => {
    if (!confirm('Generate a new link? Your current subscriptions will stop updating.')) return
    setFeedToken(await rotateFeedToken(user.id))
  }

  if (events === null) return <Spinner />

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((e) => e.event_date >= today).length
  const venues = new Set(events.map((e) => e.venue).filter(Boolean)).size
  const shareLink = `${window.location.origin}/signup`
  const copy = () =>
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  const totem = totemByIcon(profile?.totem)
  const slug = (profile?.name || 'you').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'you'
  const importAddr = inboxToken ? `${slug}-${inboxToken}@in.tikcal.nyc` : ''
  const copyAddr = () =>
    navigator.clipboard.writeText(importAddr).then(() => {
      setCopiedAddr(true)
      setTimeout(() => setCopiedAddr(false), 2000)
    })

  return (
    <>
      <GridBg lite />
      <Wrap>
        {/* Profile card */}
        <HudBox className="p-5 mb-3 flex items-center gap-4">
          <div className="w-14 h-14 rounded border border-mint/50 bg-mint/10 flex items-center justify-center shrink-0">
            {profile?.totem ? <Totem icon={profile.totem} size={32} /> : <Icon name="user" size={26} className="text-mint" />}
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-lg uppercase text-[#e8f4f8] truncate">{profile?.name}</h2>
            <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
              {profile?.favorite_venue && (
                <><Icon name="map-pin" size={11} className="text-ice" /> {profile.favorite_venue}</>
              )}
              {totem && <span className="text-slate-700">· {totem.name}</span>}
            </div>
            {profile?.bio && <p className="text-slate-400 text-xs mt-2 leading-relaxed">{profile.bio}</p>}
          </div>
        </HudBox>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { n: events.length, l: 'Total', tone: 'ice' },
            { n: upcoming, l: 'Upcoming', tone: 'mint' },
            { n: venues, l: 'Venues', tone: 'ice' },
          ].map((s) => (
            <HudBox key={s.l} tone={s.tone} className="p-4 text-center">
              <div className={`font-display font-extrabold text-2xl ${s.tone === 'mint' ? 'text-mint' : 'text-[#e8f4f8]'}`}>
                {String(s.n).padStart(2, '0')}
              </div>
              <div className="font-mono text-[9px] text-slate-500 uppercase mt-1">{s.l}</div>
            </HudBox>
          ))}
        </div>

        {/* Invite */}
        <HudBox className="p-4 mb-3">
          <SecLabel className="mb-2">▸ Invite friends</SecLabel>
          <div className="flex gap-2">
            <div className="flex-1 bg-white/[0.04] border border-white/10 rounded px-3 py-2 font-mono text-[10px] text-slate-500 truncate">
              {shareLink}
            </div>
            <Btn variant={copied ? 'ghost' : 'ice'} onClick={copy} cls="shrink-0">
              {copied ? '✓ Copied' : 'Copy'}
            </Btn>
          </div>
        </HudBox>

        {/* Email auto-import */}
        <HudBox tone="mint" className="p-4 mb-3">
          <SecLabel className="mb-2 flex items-center gap-1.5">
            <Icon name="sparkle" size={11} className="text-mint" /> Auto-import from email
          </SecLabel>
          <p className="text-slate-400 text-xs mb-3 leading-relaxed">
            Forward ticket confirmations (DICE, RA, Ticketmaster, AXS…) here and they’ll land on your calendar automatically.
            Set a one-time forward rule in Gmail/Outlook and you’re hands-off.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-white/[0.04] border border-white/10 rounded px-3 py-2 font-mono text-[10px] text-slate-400 truncate">
              {importAddr || 'generating…'}
            </div>
            <Btn variant={copiedAddr ? 'ghost' : 'mint'} onClick={copyAddr} disabled={!importAddr} cls="shrink-0">
              {copiedAddr ? '✓ Copied' : 'Copy'}
            </Btn>
          </div>
        </HudBox>

        {/* Subscribe feed → Apple / Google / Outlook */}
        <HudBox className="p-4 mb-3">
          <SecLabel className="mb-2 flex items-center gap-1.5">
            <Icon name="calendar-check" size={11} className="text-ice" /> Sync to your calendar
          </SecLabel>
          <p className="text-slate-400 text-xs mb-3 leading-relaxed">
            Subscribe once and every TikCal show — yours and your crew’s — auto-syncs into Apple, Google, or Outlook.
            New shows and RSVPs just appear. Keep this link private; it shows your calendar.
          </p>
          {feedToken ? (
            <>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 bg-white/[0.04] border border-white/10 rounded px-3 py-2 font-mono text-[10px] text-slate-400 truncate">
                  {feedUrls(feedToken).webcal}
                </div>
                <Btn
                  variant={copiedFeed ? 'ghost' : 'ice'}
                  onClick={() =>
                    navigator.clipboard.writeText(feedUrls(feedToken).webcal).then(() => {
                      setCopiedFeed(true)
                      setTimeout(() => setCopiedFeed(false), 2000)
                    })
                  }
                  cls="shrink-0"
                >
                  {copiedFeed ? '✓ Copied' : 'Copy'}
                </Btn>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <a href={feedUrls(feedToken).webcal} className="font-mono text-[10px] text-mint underline">
                  Add to Apple Calendar →
                </a>
                <a
                  href={`https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(feedUrls(feedToken).https)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-ice underline"
                >
                  Add to Google →
                </a>
                <button onClick={rotateFeed} className="font-mono text-[10px] text-slate-600 hover:text-slate-400 underline">
                  Reset link
                </button>
              </div>
            </>
          ) : (
            <p className="font-mono text-[10px] text-slate-600">generating…</p>
          )}
        </HudBox>

        {/* Google Calendar connection (powers real free/busy in Plan) */}
        <HudBox className="p-4 mb-3">
          <SecLabel className="mb-2 flex items-center gap-1.5">
            <Icon name="google-logo" size={11} className="text-ice" /> Google Calendar
          </SecLabel>
          {profile?.google_calendar_email ? (
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] text-slate-400 truncate">
                <span className="text-mint">✓ Connected</span> · {profile.google_calendar_email}
              </p>
              <Btn variant="ghost" onClick={unlinkGoogle} cls="shrink-0 !px-3 !py-2">Disconnect</Btn>
            </div>
          ) : (
            <>
              <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                Connect your Google Calendar so <button onClick={() => navigate('/plan')} className="text-ice underline">Plan a Night</button> knows
                when you’re actually free — busy times from your real calendar get factored in.
              </p>
              <Btn variant="ice" onClick={connectGoogle} disabled={connecting}>
                {connecting ? 'Opening Google…' : 'Connect Google Calendar'}
              </Btn>
            </>
          )}
          {gErr && <p className="text-red-400 text-[11px] mt-2">{gErr}</p>}
        </HudBox>

        {/* Account */}
        <HudBox className="p-4">
          <SecLabel className="mb-2">▸ Account</SecLabel>
          <p className="font-mono text-[11px] text-slate-500 mb-3">{user?.email}</p>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => navigate('/setup')}>Edit Profile</Btn>
            <Btn variant="danger" onClick={async () => { await signOut(); navigate('/login') }}>Sign out</Btn>
          </div>
        </HudBox>
      </Wrap>
    </>
  )
}
