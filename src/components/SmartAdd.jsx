import { useRef, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { Inp, Txta, Btn } from './ui.jsx'

// Reads a File as bare base64 (no data: prefix), for Claude vision.
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })

const TABS = [
  { id: 'link', label: 'Link' },
  { id: 'text', label: 'Paste text' },
  { id: 'image', label: 'Screenshot' },
]

// "Smart Add" — sends a ticket source to the `ingest` Edge Function and hands
// the extracted fields back to the parent to prefill the form.
export function SmartAdd({ onResult }) {
  const [tab, setTab] = useState('link')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [imgName, setImgName] = useState('')
  const [imgData, setImgData] = useState(null) // { image_base64, media_type }
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
        // Edge function returns { error } with a non-2xx status.
        let msg = 'Could not read that source.'
        try {
          const j = await error.context?.json?.()
          if (j?.error) msg = j.error
        } catch {
          /* ignore */
        }
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
    <div className="border border-accent/20 bg-accent/[0.04] rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🪩</span>
        <h2 className="heading-type text-white text-sm">Smart Add</h2>
        <span className="text-gray-600 text-[11px]">— drop a ticket and we’ll fill it in</span>
      </div>

      <div className="flex gap-1 mb-3 bg-white/[0.04] rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              setErr('')
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'link' && (
        <Inp value={url} onChange={setUrl} placeholder="https://ra.co/events/… or any ticket link" />
      )}
      {tab === 'text' && (
        <Txta value={text} onChange={setText} placeholder="Paste the confirmation email or event details…" rows={3} />
      )}
      {tab === 'image' && (
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-white/15 hover:border-accent/40 rounded-xl px-4 py-3 text-left text-xs text-gray-500 transition-colors"
          >
            {imgName ? `📸 ${imgName}` : '📸 Choose a screenshot / flyer'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
        </div>
      )}

      {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
      {done && !err && <p className="text-accent text-xs mt-2">✓ Filled in below — review and save.</p>}

      <div className="mt-3">
        <Btn onClick={run} disabled={loading} cls="text-xs">
          {loading ? 'Reading…' : 'Auto-fill ↓'}
        </Btn>
      </div>
    </div>
  )
}
