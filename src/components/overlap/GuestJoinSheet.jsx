import { useState } from 'react'
import { Btn, Inp, HudBox } from '../ui.jsx'
import { FEATURE_NAME } from '../../lib/overlap/theme.js'

// No-login entry (spec §7): a guest picks a display name to join. The returned
// participant id becomes their bearer capability (kept in localStorage by the api).
export default function GuestJoinSheet({ sessionName, onJoin, error }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    await onJoin(name.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <HudBox hero className="w-full max-w-sm p-6 text-center">
        <div className="font-mono text-[11px] text-ice uppercase tracking-[0.16em] mb-2">{FEATURE_NAME}</div>
        <div className="font-heading font-bold text-xl text-[#e8f4f8] mb-1">{sessionName || 'Find a night'}</div>
        <div className="font-mono text-[11px] text-slate-500 mb-5">
          Add your name to mark when you're free — no account needed.
        </div>
        <Inp value={name} onChange={setName} placeholder="Your name" />
        {error && <div className="font-mono text-xs text-red-400 mt-3">{error}</div>}
        <Btn variant="mint" onClick={submit} disabled={!name.trim() || busy} cls="w-full mt-4">
          {busy ? 'Joining…' : 'Join'}
        </Btn>
      </HudBox>
    </div>
  )
}
