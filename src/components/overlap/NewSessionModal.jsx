import { useState } from 'react'
import { Btn, Inp, SecLabel, HudBox } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { DAYPARTS, DOW, DOW_PRESETS } from '../../lib/overlap/theme.js'
import { createSession } from '../../lib/overlap/api.js'

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const arrEq = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

// Small pill toggle used for both day-of-week and daypart pickers.
const Pill = ({ active, onClick, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`min-w-[44px] h-11 px-3 rounded font-mono text-xs font-bold uppercase tracking-wide border transition-all ${
      active
        ? 'border-violet bg-violet/15 text-violet shadow-[0_0_10px_rgba(76,201,240,0.25)]'
        : 'border-white/10 text-slate-500 hover:border-white/25 hover:text-white'
    }`}
  >
    {children}
  </button>
)

export default function NewSessionModal({ creatorName, onClose, onCreated }) {
  const today = new Date()
  const in10w = new Date(today)
  in10w.setDate(today.getDate() + 70)

  const [name, setName] = useState('')
  const [rangeStart, setRangeStart] = useState(ymd(today))
  const [rangeEnd, setRangeEnd] = useState(ymd(in10w))
  const [daysOfWeek, setDaysOfWeek] = useState(DOW_PRESETS.Weekends)
  const [dayparts, setDayparts] = useState(['night'])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const toggleDow = (i) =>
    setDaysOfWeek((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))
  const toggleDaypart = (k) =>
    setDayparts((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))

  const valid =
    daysOfWeek.length > 0 && dayparts.length > 0 && rangeStart && rangeEnd && rangeEnd >= rangeStart

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setErr('')
    try {
      const session = await createSession(
        { name, rangeStart, rangeEnd, daysOfWeek, dayparts },
        creatorName,
      )
      onCreated(session)
    } catch (e) {
      setErr(e.message || 'Could not create session')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <HudBox
        hero
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-t-2xl sm:rounded"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="font-heading font-bold text-lg text-[#e8f4f8]">New Overlap</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white" title="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <Inp label="Name" value={name} onChange={setName} placeholder="Rave crew · July" />

          <div className="grid grid-cols-2 gap-3">
            <Inp label="From" type="date" value={rangeStart} onChange={setRangeStart} />
            <Inp label="To" type="date" value={rangeEnd} onChange={setRangeEnd} />
          </div>

          <div>
            <SecLabel className="mb-2">Which days count</SecLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DOW.map((d, idx) => (
                <Pill key={idx} active={daysOfWeek.includes(d.i)} onClick={() => toggleDow(d.i)}>
                  {d.label}
                </Pill>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(DOW_PRESETS).map(([label, set]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDaysOfWeek(set)}
                  className={`px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wide border transition-colors ${
                    arrEq(daysOfWeek, set)
                      ? 'border-mint/50 text-mint'
                      : 'border-white/10 text-slate-500 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SecLabel className="mb-2">Which times count</SecLabel>
            <div className="flex flex-wrap gap-1.5">
              {DAYPARTS.map((d) => (
                <Pill
                  key={d.key}
                  active={dayparts.includes(d.key)}
                  onClick={() => toggleDaypart(d.key)}
                  title={d.sub}
                >
                  {d.label}
                </Pill>
              ))}
            </div>
          </div>

          {err && <div className="font-mono text-xs text-red-400">{err}</div>}

          <div className="flex gap-2 pt-1">
            <Btn variant="ghost" onClick={onClose} cls="flex-1">
              Cancel
            </Btn>
            <Btn variant="mint" onClick={submit} disabled={!valid || busy} cls="flex-1">
              {busy ? 'Creating…' : 'Create'}
            </Btn>
          </div>
        </div>
      </HudBox>
    </div>
  )
}
