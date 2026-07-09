import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Wrap, Btn, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { FEATURE_NAME, DAYPARTS } from '../lib/overlap/theme.js'
import { listMySessions } from '../lib/overlap/api.js'
import NewSessionModal from '../components/overlap/NewSessionModal.jsx'

const fmtRange = (s) => {
  const a = new Date(s.range_start + 'T12:00:00')
  const b = new Date(s.range_end + 'T12:00:00')
  const o = { month: 'short', day: 'numeric' }
  return `${a.toLocaleDateString('en-US', o)} – ${b.toLocaleDateString('en-US', o)}`
}
const fmtDayparts = (s) =>
  (s.dayparts || []).map((k) => DAYPARTS.find((d) => d.key === k)?.label || k).join(' · ')

export default function Overlap() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(false)

  useEffect(() => {
    listMySessions()
      .then(setSessions)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const now = new Date()
  const active = sessions.filter((s) => new Date(s.expires_at) > now)
  const expired = sessions.filter((s) => new Date(s.expires_at) <= now)

  return (
    <>
      <GridBg lite />
      <Wrap>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-mono text-[11px] text-ice uppercase tracking-[0.16em]">{FEATURE_NAME}</div>
            <h1 className="font-heading font-bold text-2xl text-[#e8f4f8]">Find a night together</h1>
          </div>
          <Btn variant="mint" onClick={() => setModal(true)}>
            <Icon name="plus" size={14} /> New
          </Btn>
        </div>

        {err && <div className="font-mono text-xs text-red-400 mb-4">{err}</div>}

        {!active.length && !expired.length && (
          <HudBox className="p-8 text-center">
            <Icon name="intersect" size={28} className="text-ice/60 mx-auto mb-3" />
            <div className="font-display font-bold text-[#e8f4f8]">No overlaps yet</div>
            <div className="font-mono text-[11px] text-slate-500 mt-1 mb-4">
              Pool free time with up to 3 friends and find the night everyone can make.
            </div>
            <Btn variant="ice" onClick={() => setModal(true)}>
              <Icon name="plus" size={14} /> Start one
            </Btn>
          </HudBox>
        )}

        {active.length > 0 && (
          <div className="space-y-2 mb-6">
            {active.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/overlap/${s.id}`)}
                className="hud w-full text-left rounded border border-ice/20 hover:border-ice/40 bg-white/[0.02] p-4 transition-all"
                style={{ '--hud-color': '#4cc9f0' }}
              >
                <div className="font-display font-bold text-base text-[#e8f4f8]">{s.name}</div>
                <div className="font-mono text-[11px] text-slate-500 uppercase mt-1 flex items-center gap-2">
                  <span>{fmtRange(s)}</span>
                  <span className="text-slate-700">·</span>
                  <span style={{ color: '#ff6b2b' }}>{fmtDayparts(s)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {expired.length > 0 && (
          <>
            <SecLabel className="mb-2">Expired</SecLabel>
            <div className="space-y-2 opacity-50">
              {expired.map((s) => (
                <div key={s.id} className="rounded border border-white/[0.06] p-3">
                  <div className="font-display font-bold text-sm text-slate-400">{s.name}</div>
                  <div className="font-mono text-[10px] text-slate-600 uppercase">{fmtRange(s)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Wrap>

      {modal && (
        <NewSessionModal
          creatorName={profile?.name || 'Me'}
          onClose={() => setModal(false)}
          onCreated={(s) => navigate(`/overlap/${s.id}`)}
        />
      )}
    </>
  )
}
