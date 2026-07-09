import { useMemo } from 'react'
import { inCriteriaDates } from '../../lib/overlap/compute.js'
import { daypartMeta, DAYPARTS, FREE_COLOR } from '../../lib/overlap/theme.js'

// Tap cycles a slot unknown → free → busy → unknown (spec §4c).
const nextState = (cur) => (cur === 'free' ? 'busy' : cur === 'busy' ? undefined : 'free')

// The current participant's own availability editor. Controlled: parent owns the
// availability object and persists (debounced). Apple-calendar users live here.
export default function ManualGrid({ session, availability, onChange }) {
  const dates = useMemo(() => inCriteriaDates(session), [session])
  const dayparts = session?.dayparts || []

  const setKey = (key, val) => {
    const next = { ...availability }
    if (val == null) delete next[key]
    else next[key] = val
    onChange(next)
  }

  const cycle = (key) => setKey(key, nextState(availability[key]))

  const fillAll = (val) => {
    const next = { ...availability }
    for (const d of dates) for (const dp of dayparts) {
      const key = `${d.dateStr}:${dp}`
      if (val == null) delete next[key]
      else next[key] = val
    }
    onChange(next)
  }

  const fillDaypart = (dp) => {
    const next = { ...availability }
    for (const d of dates) next[`${d.dateStr}:${dp}`] = 'free'
    onChange(next)
  }

  if (!dates.length || !dayparts.length) return null
  const gridTemplateColumns = `40px repeat(${dates.length}, minmax(44px, 1fr))`

  const cellStyle = (val) => {
    if (val === 'free')
      return { backgroundColor: FREE_COLOR, color: '#1a0d00', boxShadow: `0 0 10px ${FREE_COLOR}55` }
    if (val === 'busy') return { backgroundColor: '#040608', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)' }
    return {}
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button onClick={() => fillAll('free')} className="px-2.5 py-1.5 rounded font-mono text-[10px] uppercase border border-white/10 text-slate-400 hover:text-white hover:border-white/25">
          All free
        </button>
        <button onClick={() => fillAll('busy')} className="px-2.5 py-1.5 rounded font-mono text-[10px] uppercase border border-white/10 text-slate-400 hover:text-white hover:border-white/25">
          All busy
        </button>
        <button onClick={() => fillAll(null)} className="px-2.5 py-1.5 rounded font-mono text-[10px] uppercase border border-white/10 text-slate-500 hover:text-white hover:border-white/25">
          Clear
        </button>
        {dayparts.length > 1 &&
          DAYPARTS.filter((d) => dayparts.includes(d.key)).map((d) => (
            <button key={d.key} onClick={() => fillDaypart(d.key)} className="px-2.5 py-1.5 rounded font-mono text-[10px] uppercase border border-white/10 text-slate-500 hover:text-white hover:border-white/25">
              {d.label} free
            </button>
          ))}
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="inline-grid gap-1 min-w-full" style={{ gridTemplateColumns }}>
          <div className="sticky left-0 z-10 bg-ink/95" />
          {dates.map((d) => {
            const dt = new Date(d.dateStr + 'T12:00:00')
            return (
              <div key={d.dateStr} className="text-center pb-1">
                <div className="font-mono text-[9px] text-slate-500 uppercase leading-tight">
                  {dt.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="font-mono text-[12px] text-slate-300 font-bold leading-tight">{dt.getDate()}</div>
              </div>
            )
          })}

          {dayparts.map((dp) => (
            <ManualRow key={dp} dp={dp} dates={dates} availability={availability} onCycle={cycle} cellStyle={cellStyle} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ManualRow({ dp, dates, availability, onCycle, cellStyle }) {
  const meta = daypartMeta(dp)
  return (
    <>
      <div className="sticky left-0 z-10 bg-ink/95 flex items-center justify-center">
        <span className="font-mono text-[10px] font-bold text-slate-400">{meta?.label || dp}</span>
      </div>
      {dates.map((d) => {
        const key = `${d.dateStr}:${dp}`
        const val = availability[key]
        return (
          <button
            key={key}
            onClick={() => onCycle(key)}
            className="h-[52px] rounded-md border border-dashed border-white/12 flex items-center justify-center font-mono text-[10px] font-bold transition-all active:scale-95"
            style={cellStyle(val)}
          >
            {val === 'free' ? 'FREE' : val === 'busy' ? '' : ''}
          </button>
        )
      })}
    </>
  )
}
