import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Btn, HudBox, SecLabel, Txta } from './ui.jsx'
import { Icon } from './icons.jsx'
import { blockUser, reportContent } from '../lib/social.js'
import { REPORT_REASONS, REPORT_DETAILS_MAX } from '../lib/blocking.js'

// "⋯" button that opens Report / Block for a person (and optionally a show).
// App Store guideline 1.2: every place another person's content appears needs
// a way to report it and block them.
//
//   person   { id, name } of the other person (required)
//   eventId  set when the content is a show, so the report names it
//   onBlocked  called after a successful block (reload lists)
export default function SafetyMenu({ person, eventId = null, onBlocked, label }) {
  const [open, setOpen] = useState(false)
  if (!person?.id) return null
  const name = person.name || 'this person'

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        aria-label={label || `More options for ${name}`}
        className="w-11 h-11 -my-1 inline-flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Icon name="dots-three-outline-vertical" size={18} />
      </button>
      {open && <SafetySheet person={person} name={name} eventId={eventId} onClose={() => setOpen(false)} onBlocked={onBlocked} />}
    </>
  )
}

function SafetySheet({ person, name, eventId, onClose, onBlocked }) {
  const [view, setView] = useState('menu') // menu | report | block | done
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [doneText, setDoneText] = useState('')
  const [didBlock, setDidBlock] = useState(false)

  // Closing after a block tells the page (it may reload or leave), so the
  // person sees the confirmation first.
  const finish = () => { onClose(); if (didBlock) onBlocked?.(person.id) }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const sendReport = async () => {
    if (!reason || busy) return
    setBusy(true); setErr('')
    const { error } = await reportContent({ userId: person.id, eventId, reason, details: details.trim() })
    setBusy(false)
    if (error) return setErr(error.message)
    setDoneText('Thanks for telling us. We review every report within 24 hours and remove content or accounts that break our Terms.')
    setView('done')
  }

  const doBlock = async () => {
    if (busy) return
    setBusy(true); setErr('')
    const { error } = await blockUser(person.id)
    setBusy(false)
    if (error) return setErr(error.message)
    setDoneText(`${name} is blocked. You won't see their shows, and they can't add you, invite you to crews or nudge you. Unblock any time in Profile.`)
    setDidBlock(true)
    setView('done')
  }

  const sheet = (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => { e.stopPropagation(); finish() }}
      role="presentation"
    >
      <HudBox
        hero
        role="dialog"
        aria-modal="true"
        aria-label={view === 'report' ? `Report ${name}` : view === 'block' ? `Block ${name}` : `Options for ${name}`}
        className="w-full sm:max-w-sm p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] rounded-b-none sm:rounded-b max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'menu' && (
          <div className="space-y-2">
            <SecLabel className="mb-3 truncate">{name}</SecLabel>
            <Btn variant="ghost" cls="w-full !justify-start min-h-11" onClick={() => setView('report')}>
              <Icon name="flag" size={14} /> {eventId ? 'Report this show' : `Report ${name}`}
            </Btn>
            <Btn variant="danger" cls="w-full !justify-start min-h-11" onClick={() => setView('block')}>
              <Icon name="prohibit" size={14} /> Block {name}
            </Btn>
            <Btn variant="ghost" cls="w-full min-h-11" onClick={onClose}>Cancel</Btn>
          </div>
        )}

        {view === 'report' && (
          <div>
            <SecLabel className="mb-1">{eventId ? 'Report this show' : `Report ${name}`}</SecLabel>
            <p className="text-slate-500 text-xs mb-3">What's wrong? {name} won't know you reported them.</p>
            <div className="space-y-1.5 mb-3" role="radiogroup" aria-label="Reason">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full min-h-11 text-left px-3 py-2.5 rounded border text-sm transition-colors ${
                    reason === r.value ? 'border-violet/70 bg-violet/15 text-white' : 'border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Txta
              label="Anything else? (optional)"
              value={details}
              onChange={(v) => setDetails(v.slice(0, REPORT_DETAILS_MAX))}
              placeholder="What happened"
              rows={3}
            />
            {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <Btn variant="ghost" cls="flex-1 min-h-11" onClick={() => setView('menu')}>Back</Btn>
              <Btn variant="aurora" cls="flex-1 min-h-11" disabled={!reason || busy} onClick={sendReport}>
                {busy ? 'Sending…' : 'Send report'}
              </Btn>
            </div>
          </div>
        )}

        {view === 'block' && (
          <div>
            <SecLabel className="mb-2">Block {name}?</SecLabel>
            <ul className="text-slate-400 text-sm space-y-1.5 mb-4 list-disc pl-5">
              <li>You'll stop being friends and any pending invites are cancelled.</li>
              <li>You won't see their shows, and they can't add you, invite you to a crew or nudge you.</li>
              <li>They aren't told. You can unblock in Profile.</li>
            </ul>
            {err && <p className="text-red-400 text-xs mb-2">{err}</p>}
            <div className="flex gap-2">
              <Btn variant="ghost" cls="flex-1 min-h-11" onClick={() => setView('menu')}>Back</Btn>
              <Btn variant="danger" cls="flex-1 min-h-11" disabled={busy} onClick={doBlock}>
                {busy ? 'Blocking…' : 'Block'}
              </Btn>
            </div>
          </div>
        )}

        {view === 'done' && (
          <div>
            <p className="text-slate-300 text-sm mb-4" role="status">{doneText}</p>
            <Btn variant="ghost" cls="w-full min-h-11" onClick={finish}>Done</Btn>
          </div>
        )}
      </HudBox>
    </div>
  )

  return createPortal(sheet, document.body)
}
