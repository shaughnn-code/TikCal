import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { getInboxToken, getAutoImportStatus, getFeedToken, rotateFeedToken, feedUrls, startGoogleConnect, disconnectGoogle, startSpotifyConnect, disconnectSpotify, syncSpotify } from '../lib/db.js'
import { GridBg, Wrap, Btn, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon, Totem } from '../components/icons.jsx'
import { totemByIcon } from '../lib/constants.js'

// Connection-state pill — the mint/muted dot-and-label read used across the
// bento grid below wherever a card needs a live status at a glance instead
// of a sentence (header chips, card corners).
const StatusPill = ({ on, label }) => (
  <span
    className={`font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-1 rounded border shrink-0 ${
      on ? 'text-mint border-mint/40 bg-mint/10' : 'text-slate-600 border-white/10 bg-white/[0.02]'
    }`}
  >
    {on ? '● ' : '○ '}
    {label}
  </span>
)

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [events, setEvents] = useState(null)
  const [copied, setCopied] = useState(false)
  const [inboxToken, setInboxToken] = useState(null)
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [importStatus, setImportStatus] = useState(null)
  const [mailProvider, setMailProvider] = useState('gmail')
  const [showHowItWorks, setShowHowItWorks] = useState(false)
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
    getAutoImportStatus(user.id).then(setImportStatus).catch(() => {})
    getFeedToken(user.id).then(setFeedToken).catch(() => {})
  }, [user.id])

  // React Router doesn't auto-scroll to a #hash on client-side nav (only on
  // a hard page load), so the stat tiles' deep link from /calendar needs it done by hand.
  useEffect(() => {
    if (!events || window.location.hash !== '#stats') return
    document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

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

  const connectSpotify = async () => {
    setConnecting(true)
    setGErr('')
    try {
      window.location.href = await startSpotifyConnect()
    } catch (e) {
      setGErr(e.message || 'Could not start the Spotify connection.')
      setConnecting(false)
    }
  }
  const unlinkSpotify = async () => {
    await disconnectSpotify(user.id)
    refreshProfile?.()
  }
  const resyncSpotify = async () => {
    try { await syncSpotify() } catch { /* ignore */ }
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

  const googleOn = !!profile?.google_calendar_email
  const spotifyOn = !!profile?.spotify_name
  const appleOn = !!profile?.apple_music_on

  return (
    <>
      <GridBg lite />
      <Wrap>
        {/* Header — identity + at-a-glance connection status, echoing the
            calendar page's "// SESSION ACTIVE" strip. */}
        <HudBox className="p-5 mb-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded border border-mint/50 bg-mint/10 flex items-center justify-center shrink-0">
              {profile?.totem ? <Totem icon={profile.totem} size={32} /> : <Icon name="user" size={26} className="text-mint" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-extrabold text-lg uppercase text-[#e8f4f8] truncate">{profile?.name}</h2>
              <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
                {profile?.favorite_venue && (
                  <><Icon name="map-pin" size={11} className="text-violet" /> {profile.favorite_venue}</>
                )}
                {totem && <span className="text-slate-700">· {totem.name}</span>}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <StatusPill on={googleOn} label="Google" />
              <StatusPill on={spotifyOn} label="Spotify" />
            </div>
          </div>
          {profile?.bio && <p className="text-slate-400 text-xs mt-3 leading-relaxed">{profile.bio}</p>}
        </HudBox>

        {/* Bento grid — mixed cell widths carry the "control room" read:
            three square stat cells, then full-width utility cards, then a
            three-up row of connection cards that mirrors the stat row. */}
        <div id="stats" className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 scroll-mt-24">
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

          {/* Invite */}
          <HudBox className="p-4 sm:col-span-3">
            <SecLabel className="mb-2">// invite_friends</SecLabel>
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
          <HudBox tone="mint" className="p-4 sm:col-span-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <SecLabel className="flex items-center gap-1.5">
                <Icon name="sparkle" size={11} className="text-mint" /> // auto_import
              </SecLabel>
              <button
                onClick={() => setShowHowItWorks(true)}
                className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-mint hover:text-white flex items-center gap-1 shrink-0 underline decoration-mint/40 underline-offset-2 hover:decoration-white/60"
              >
                <Icon name="shield-check" size={12} /> How it works &amp; is it safe?
              </button>
            </div>
            <p className="text-slate-400 text-xs mb-3 leading-relaxed">
              Forward ticket confirmations (DICE, RA, Ticketmaster, AXS…) here and they’ll land on your calendar automatically.
            </p>

            {importStatus?.count > 0 && (
              <div className="mb-3">
                <StatusPill on label={`${importStatus.count} ticket${importStatus.count === 1 ? '' : 's'} auto-imported · last ${new Date(importStatus.lastDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`} />
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-white/[0.04] border border-white/10 rounded px-3 py-2 font-mono text-[10px] text-slate-400 truncate">
                {importAddr || 'generating…'}
              </div>
              <Btn variant={copiedAddr ? 'ghost' : 'ghost'} onClick={copyAddr} disabled={!importAddr} cls="shrink-0">
                {copiedAddr ? '✓ Copied' : 'Copy'}
              </Btn>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              {[
                { id: 'gmail', l: 'Gmail' },
                { id: 'outlook', l: 'Outlook' },
                { id: 'icloud', l: 'iCloud' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setMailProvider(p.id)}
                  className={`font-mono text-[9px] uppercase tracking-[0.1em] px-2.5 py-1.5 rounded border transition-colors ${
                    mailProvider === p.id
                      ? 'text-mint border-mint/40 bg-mint/10'
                      : 'text-slate-500 border-white/10 hover:border-white/20 hover:text-slate-300'
                  }`}
                >
                  {p.l}
                </button>
              ))}
            </div>

            {mailProvider === 'icloud' ? (
              <p className="text-slate-500 text-[11px] leading-relaxed">
                iCloud Mail doesn’t support a direct settings link — copy the address above, then in Mail on iCloud.com go to
                Settings → Rules → Add a Rule, and forward mail from your ticket vendors to it.
              </p>
            ) : (
              <Btn
                variant="mint"
                cls="w-full"
                disabled={!importAddr}
                onClick={() => {
                  copyAddr()
                  window.open(
                    mailProvider === 'gmail'
                      ? 'https://mail.google.com/mail/u/0/#settings/fwdandpop'
                      : 'https://outlook.live.com/mail/0/options/mail/forwarding',
                    '_blank',
                    'noopener',
                  )
                }}
              >
                <Icon name="arrow-square-out" size={12} /> Set up auto-forward
              </Btn>
            )}
            {mailProvider !== 'icloud' && (
              <p className="text-slate-500 text-[10px] mt-2 leading-relaxed">
                Address copied — paste it into the forwarding field that just opened, then save.
              </p>
            )}
          </HudBox>

          {/* Subscribe feed → Apple / Google / Outlook */}
          <HudBox className="p-4 sm:col-span-3">
            <SecLabel className="mb-2 flex items-center gap-1.5">
              <Icon name="calendar-check" size={11} className="text-violet" /> // sync_calendar
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
                    className="font-mono text-[10px] text-violet underline"
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
          <HudBox className="p-4">
            <div className="flex flex-col items-start gap-1.5 mb-2">
              <SecLabel className="flex items-center gap-1.5">
                <Icon name="google-logo" size={11} className="text-violet" /> // google_calendar
              </SecLabel>
              <StatusPill on={googleOn} label={googleOn ? 'Live' : 'Off'} />
            </div>
            {googleOn ? (
              <>
                <p className="font-mono text-[10px] text-slate-400 truncate mb-3">{profile.google_calendar_email}</p>
                <Btn variant="ghost" onClick={unlinkGoogle} cls="!px-3 !py-2">Disconnect</Btn>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                  Powers real free/busy in <button onClick={() => navigate('/plan')} className="text-violet underline">Plan a Night</button>.
                </p>
                <Btn variant="ice" onClick={connectGoogle} disabled={connecting}>
                  {connecting ? 'Opening…' : 'Connect'}
                </Btn>
              </>
            )}
            {gErr && <p className="text-red-400 text-[11px] mt-2">{gErr}</p>}
          </HudBox>

          {/* Spotify — powers Discover / "For You" */}
          <HudBox className="p-4">
            <div className="flex flex-col items-start gap-1.5 mb-2">
              <SecLabel className="flex items-center gap-1.5">
                <Icon name="spotify-logo" size={12} className="text-mint" /> // spotify
              </SecLabel>
              <StatusPill on={spotifyOn} label={spotifyOn ? 'Live' : 'Off'} />
            </div>
            {spotifyOn ? (
              <>
                <p className="font-mono text-[10px] text-slate-400 truncate mb-3">{profile.spotify_name}</p>
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={resyncSpotify} cls="!px-3 !py-2">Refresh</Btn>
                  <Btn variant="ghost" onClick={unlinkSpotify} cls="!px-3 !py-2">Disconnect</Btn>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                  Floats shows in <button onClick={() => navigate('/discover')} className="text-violet underline">Discover</button> from artists you listen to.
                </p>
                <Btn variant="mint" onClick={connectSpotify} disabled={connecting}>
                  {connecting ? 'Opening…' : 'Connect'}
                </Btn>
              </>
            )}
          </HudBox>

          {/* Apple Music — needs Apple Developer setup (see functions/README) */}
          <HudBox className="p-4">
            <div className="flex flex-col items-start gap-1.5 mb-2">
              <SecLabel className="flex items-center gap-1.5">
                <Icon name="apple-logo" size={12} className="text-slate-300" /> // apple_music
              </SecLabel>
              <StatusPill on={appleOn} label={appleOn ? 'Live' : 'Soon'} />
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              {appleOn
                ? 'Connected — your Apple Music artists feed Discover.'
                : 'Coming once the Apple Music key is configured.'}
            </p>
          </HudBox>

          {/* Account */}
          <HudBox className="p-4 sm:col-span-3">
            <SecLabel className="mb-2">// account</SecLabel>
            <p className="font-mono text-[11px] text-slate-500 mb-3">{user?.email}</p>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => navigate('/setup')}>Edit Profile</Btn>
              <Btn variant="danger" onClick={async () => { await signOut(); navigate('/login') }}>Sign out</Btn>
            </div>
          </HudBox>
        </div>
      </Wrap>

      {showHowItWorks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowHowItWorks(false)}
        >
          <HudBox
            hero
            tone="mint"
            className="w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="font-display font-extrabold text-lg text-[#e8f4f8] flex items-center gap-2">
                <Icon name="shield-check" size={20} className="text-mint" /> How auto-import works
              </h3>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-slate-500 hover:text-white shrink-0 p-1 -m-1"
                aria-label="Close"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              You get a <strong className="text-mint">private address</strong> that only you know. Forward a ticket
              confirmation to it, and within a minute the show shows up on your calendar — venue, date, and all.
            </p>

            <SecLabel className="mb-2 text-mint">// the 3 steps</SecLabel>
            <ol className="space-y-2 mb-4">
              {[
                'Pick your email provider above and hit "Set up auto-forward" — your address is copied and your provider\'s forwarding settings open automatically.',
                'Paste the address into the forwarding field and save (your provider may ask you to confirm once — we\'ll relay that confirmation code straight to your real inbox).',
                'That\'s it. Every future ticket confirmation from that inbox auto-forwards and lands on your calendar — no more manual entry.',
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-slate-300 text-xs leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-mint/15 border border-mint/40 text-mint font-mono text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <SecLabel className="mb-2 text-mint">// why it's safe</SecLabel>
            <ul className="space-y-2 mb-1">
              {[
                'No password or login is ever shared with TikCal — you never connect your email account, you just forward mail to us, the same as CC-ing a friend.',
                'We only read what you forward. TikCal never sees the rest of your inbox and can\'t — there\'s no access to it at all.',
                'Only ticket confirmations turn into events. Ads, on-sale alerts, and anything that isn\'t a real "you\'re going" confirmation get discarded automatically.',
                'Forward the wrong thing? No harm — anything that doesn\'t look like a real ticket is dropped, not stored.',
                'Stop anytime by deleting the forwarding rule in your email settings — same place you set it up.',
              ].map((point, i) => (
                <li key={i} className="flex gap-2 text-slate-400 text-xs leading-relaxed">
                  <Icon name="check-circle" size={14} className="text-mint shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <Btn variant="mint" cls="w-full mt-5" onClick={() => setShowHowItWorks(false)}>
              Got it
            </Btn>
          </HudBox>
        </div>
      )}
    </>
  )
}
