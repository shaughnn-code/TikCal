import { useRef, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { Inp, Txta, Btn, HudBox } from './ui.jsx'
import { Icon } from './icons.jsx'

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })

const TABS = [
  { id: 'link', label: 'LINK' },
  { id: 'text', label: 'TEXT' },
  { id: 'image', label: 'SHOT' },
]

// "Smart Add" — sends a ticket source to the `ingest` Edge Function and hands
// extracted fields back to prefill the form.
export function SmartAdd({ onResult }) {
  const [tab, setTab] = useState('link')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [imgName, setImgName] = useState('')
  const [imgData, setImgData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const fileRef = useRef(null)

  const pickImage = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setImgName(f.name)
    setImgData({ image_base64: await fileToBase64(f), media_type: f.type || 'image/jpeg' })
  }

  const run = async () => {
    setErr('')
    setDone(false)
    let body
    if (tab === 'link') {
      if (!url.trim()) return setErr('Paste a link first.')
      body = { type: 'link', url: url.trim() }
    } else if (tab === 'text') {
      if (text.trim().length < 4) return setErr('Paste the event details first.')
      body = { type: 'text', text }
    } else {
      if (!imgData) return setErr('Choose a screenshot first.')
      body = { type: 'image', ...imgData }
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ingest', { body })
      if (error) {
        let msg = 'Could not read that source.'
        try {
          const j = await error.context?.json?.()
          if (j?.error) msg = j.error
        } catch { /* ignore */ }
        throw new Error(msg)
      }
      onResult(data.fields)
      setDone(true)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <HudBox tone="mint" className="p-4 mb-6 border-mint/30 bg-mint/[0.05]">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="sparkle" size={16} className="text-mint" />
        <h2 className="font-display font-bold text-[#e8f4f8] text-sm">Smart Add</h2>
        <span className="font-mono text-[10px] text-slate-500">— drop a ticket</span>
      </div>

      <div className="flex gap-1 mb-3 bg-white/[0.04] rounded p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setErr('') }}
            className={`px-3 py-1.5 rounded font-mono text-[10px] tracking-wide transition-all ${
              tab === t.id ? 'bg-white/10 text-mint' : 'text-slate-600 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'link' && <Inp value={url} onChange={setUrl} placeholder="https://ra.co/events/… or any ticket link" />}
      {tab === 'text' && <Txta value={text} onChange={setText} placeholder="Paste the confirmation email or event details…" rows={3} />}
      {tab === 'image' && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-white/15 hover:border-mint/40 rounded px-4 py-3 text-left font-mono text-[11px] text-slate-500 transition-colors flex items-center gap-2"
          >
            <Icon name="camera" size={14} /> {imgName || 'Choose a screenshot / flyer'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
        </>
      )}

      {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
      {done && !err && <p className="text-mint text-xs mt-2">✓ Filled in below — review and save.</p>}

      <div className="mt-3">
        <Btn variant="mint" onClick={run} disabled={loading}>
          {loading ? 'Reading…' : 'Auto-fill ↓'}
        </Btn>
      </div>
    </HudBox>
  )
}
