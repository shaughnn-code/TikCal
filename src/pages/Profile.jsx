import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { getInboxToken } from '../lib/db.js'
import { GridBg, Wrap, Btn, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon, Totem } from '../components/icons.jsx'
import { totemByIcon } from '../lib/constants.js'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState(null)
  const [copied, setCopied] = useState(false)
  const [inboxToken, setInboxToken] = useState(null)
  const [copiedAddr, setCopiedAddr] = useState(false)

  useEffect(() => {
    supabase
      .from('events')
      .select('event_date, venue')
      .eq('owner_id', user.id)
      .then(({ data }) => setEvents(data || []))
    getInboxToken(user.id).then(setInboxToken).catch(() => {})
  }, [user.id])

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
