import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { fetchMyCrews } from '../lib/db.js'
import { GridBg, Wrap, Inp, Txta, Btn, SecLabel } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { SmartAdd } from '../components/SmartAdd.jsx'
import { VenuePicker } from '../components/VenuePicker.jsx'

export default function AddEvent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fileRef = useRef(null)

  // The Plan page links here with ?date=YYYY-MM-DD to seed an open night.
  const seedDate = params.get('date') || ''
  const [form, setForm] = useState({ title: '', artist: '', event_date: seedDate, venue: '', notes: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [shareFriends, setShareFriends] = useState(false)
  const [crews, setCrews] = useState([])
  const [selCrews, setSelCrews] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    fetchMyCrews().then(setCrews).catch(() => {})
  }, [])

  const onFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    const r = new FileReader()
    r.onload = (ev) => setPreview(ev.target.result)
    r.readAsDataURL(f)
  }

  const toggleCrew = (id) =>
    setSelCrews((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // VenuePicker accepts free-text; keep the extracted venue as-is.
  const applyFields = (f) =>
    setForm({
      title: f.title || '',
      artist: f.artist || '',
      event_date: f.event_date || '',
      venue: f.venue || '',
      notes: f.notes || '',
    })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.event_date || !form.venue) return
    setSaving(true)
    setErr('')
    try {
      let flyer_url = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('flyers').upload(path, file)
        if (upErr) throw upErr
        flyer_url = supabase.storage.from('flyers').getPublicUrl(path).data.publicUrl
      }
      const { data: event, error: insErr } = await supabase
        .from('events')
        .insert({ ...form, owner_id: user.id, share_friends: shareFriends, flyer_url })
        .select()
        .single()
      if (insErr) throw insErr
      if (selCrews.size) {
        const rows = [...selCrews].map((crew_id) => ({ event_id: event.id, crew_id }))
        const { error: ecErr } = await supabase.from('event_crews').insert(rows)
        if (ecErr) throw ecErr
      }
      navigate('/calendar')
    } catch (e2) {
      setSaving(false)
      setErr(e2.message || 'Could not save the show.')
    }
  }

  const audienceBtn = (active, onClick, label, state) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between border rounded px-4 py-3 transition-all ${
        active ? 'border-mint bg-mint/10' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <span className="text-sm text-[#e8f4f8]">{label}</span>
      <span className={`font-mono text-[10px] ${active ? 'text-mint' : 'text-slate-600'}`}>{state}</span>
    </button>
  )

  return (
    <>
      <GridBg lite />
      <Wrap>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/calendar')} className="text-slate-500 hover:text-violet transition-colors">
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="font-display font-extrabold text-xl uppercase text-[#e8f4f8]">Add a Show</h1>
        </div>

        <SmartAdd onResult={applyFields} />

        <form onSubmit={submit} className="space-y-5">
          <Inp label="Event / Night Title" value={form.title} onChange={set('title')} placeholder="e.g. Open Air" required />
          <Inp label="Artist(s)" value={form.artist} onChange={set('artist')} placeholder="e.g. FJAAK" />

          <div className="grid grid-cols-2 gap-4">
            <Inp label="Date" type="date" value={form.event_date} onChange={set('event_date')} required />
            <VenuePicker label="Venue" value={form.venue} onChange={set('venue')} />
          </div>

          <Txta label="Notes (optional)" value={form.notes} onChange={set('notes')} placeholder="Doors at 10, tickets at will call…" />

          {/* Flyer upload */}
          <div>
            <SecLabel className="mb-2">Screenshot / Flyer (optional)</SecLabel>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border border-dashed rounded p-6 text-center cursor-pointer transition-all hover:border-violet/40 ${
                preview ? 'border-violet/30' : 'border-white/10'
              }`}
            >
              {preview ? (
                <div>
                  <img src={preview} alt="Preview" className="max-h-28 mx-auto rounded object-cover mb-2" />
                  <p className="font-mono text-[10px] text-slate-500">Click to change</p>
                </div>
              ) : (
                <div className="text-slate-600">
                  <Icon name="camera" size={26} className="mx-auto mb-2 opacity-50" />
                  <p className="font-mono text-[10px]">Upload flyer or screenshot</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          </div>

          {/* Audience picker */}
          <div>
            <SecLabel className="mb-3">Who can see this?</SecLabel>
            <div className="space-y-2">
              {audienceBtn(shareFriends, () => setShareFriends((s) => !s), 'All my friends', shareFriends ? '✓ SHARED' : 'PRIVATE')}
              {crews.map((c) =>
                audienceBtn(
                  selCrews.has(c.id),
                  () => toggleCrew(c.id),
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color || '#4cc9f0', boxShadow: `0 0 7px ${c.color || '#4cc9f0'}` }}
                    />
                    {c.name}
                  </span>,
                  selCrews.has(c.id) ? '✓ SHARED' : 'ADD',
                ),
              )}
            </div>
            <p className="font-mono text-[10px] text-slate-600 mt-2">Leave everything off to keep this show private to you.</p>
          </div>

          {err && <p className="text-red-400 text-xs">{err}</p>}

          <div className="flex gap-3 pt-2">
            <Btn type="submit" variant="ice" disabled={!form.title || !form.event_date || !form.venue || saving} cls="flex-1">
              {saving ? 'Adding…' : '+ Add to Calendar'}
            </Btn>
            <Btn variant="ghost" onClick={() => navigate('/calendar')}>Cancel</Btn>
          </div>
        </form>
      </Wrap>
    </>
  )
}
