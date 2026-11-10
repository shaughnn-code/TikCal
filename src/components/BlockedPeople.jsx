import { useEffect, useState } from 'react'
import { Btn, HudBox, SecLabel } from './ui.jsx'
import { Icon, Totem } from './icons.jsx'
import { loadBlockedPeople, unblockUser } from '../lib/social.js'

// Profile card: the people you blocked, with Unblock, plus how to reach the
// team about safety (App Store guideline 1.2 asks for published contact info).
export default function BlockedPeople() {
  const [people, setPeople] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)

  const load = () => loadBlockedPeople().then(setPeople).catch(() => setPeople([]))
  useEffect(() => { load() }, [])

  const unblock = async (id) => {
    setBusy(id); setErr('')
    const { error } = await unblockUser(id)
    setBusy(null)
    if (error) return setErr(error.message)
    load()
  }

  return (
    <HudBox className="p-4 col-span-3">
      <SecLabel className="mb-2 flex items-center gap-1.5">
        <Icon name="shield-check" size={12} /> // safety
      </SecLabel>
      <p className="text-slate-500 text-xs mb-3">
        Report or block anyone from the <Icon name="dots-three-outline-vertical" size={11} className="inline" /> menu
        next to their name. We review reports within 24 hours. Questions or urgent safety issues:{' '}
        <a href="mailto:dev@tikcal.nyc" className="text-violet underline underline-offset-2">dev@tikcal.nyc</a>
      </p>
      <div className="font-mono text-[11px] text-slate-400 uppercase tracking-[0.1em] mb-2">Blocked people</div>
      {people === null ? (
        <p className="font-mono text-[11px] text-slate-600">Loading…</p>
      ) : people.length === 0 ? (
        <p className="font-mono text-[11px] text-slate-600">You haven't blocked anyone.</p>
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2">
              <span className="flex items-center gap-2 min-w-0">
                {p.profile?.totem ? <Totem icon={p.profile.totem} size={16} /> : <Icon name="user" size={14} className="text-slate-500" />}
                <span className="text-sm text-slate-300 truncate">{p.profile?.name || 'Someone'}</span>
              </span>
              <Btn variant="ghost" cls="!px-3 !py-2 min-h-11" disabled={busy === p.id} onClick={() => unblock(p.id)}>
                {busy === p.id ? 'Unblocking…' : 'Unblock'}
              </Btn>
            </div>
          ))}
        </div>
      )}
      {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
    </HudBox>
  )
}
