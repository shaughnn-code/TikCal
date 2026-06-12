import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { Wrap, Btn, Spinner } from '../components/ui.jsx'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase
      .from('events')
      .select('event_date, venue')
      .eq('owner_id', user.id)
      .then(({ data }) => setEvents(data || []))
  }, [user.id])

  if (events === null) return <Spinner />

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((e) => e.event_date >= today).length
  const venues = new Set(events.map((e) => e.venue).filter(Boolean)).size

  const shareLink = `${window.location.origin}/signup`
  const copy = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <Wrap>
      {/* Profile card */}
      <div className="border border-white/[0.08] rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <span className="text-accent font-semibold text-lg">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="heading-type text-white text-lg leading-tight">{profile?.name}</h2>
              {profile?.totem && <span className="text-xl">{profile.totem}</span>}
            </div>
            {profile?.bio && <p className="text-gray-400 text-sm mb-3 leading-relaxed">{profile.bio}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              {profile?.favorite_venue && <span>📍 {profile.favorite_venue}</span>}
              <span>🎟 {events.length} shows</span>
              <span>🗓 {upcoming} upcoming</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total', value: events.length },
          { label: 'Upcoming', value: upcoming },
          { label: 'Venues', value: venues },
        ].map((s) => (
          <div key={s.label} className="border border-white/[0.08] rounded-2xl p-4 text-center">
            <div className="text-2xl font-semibold text-white mb-0.5">{s.value}</div>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Invite */}
      <div className="border border-white/[0.08] rounded-2xl p-5 mb-4">
        <h3 className="text-sm font-medium text-white mb-1">Invite friends</h3>
        <p className="text-gray-600 text-xs mb-3">Share this link so friends can create their own account</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[11px] text-gray-500 truncate font-mono">
            {shareLink}
          </div>
          <Btn onClick={copy} variant={copied ? 'ghost' : 'primary'} cls="shrink-0 text-xs px-3">
            {copied ? '✓ Copied' : 'Copy'}
          </Btn>
        </div>
      </div>

      {/* Account */}
      <div className="border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-sm font-medium text-white mb-1">Account</h3>
        <p className="text-gray-600 text-xs mb-4">{user?.email}</p>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => navigate('/setup')} cls="text-xs px-3">
            Edit Profile
          </Btn>
          <Btn
            variant="danger"
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
            cls="text-xs px-3"
          >
            Sign out
          </Btn>
        </div>
      </div>
    </Wrap>
  )
}
