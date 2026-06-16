import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { fetchMyCrews } from '../lib/db.js'
import { Wrap, Inp, Txta, Sel, Btn } from '../components/ui.jsx'
import { SmartAdd } from '../components/SmartAdd.jsx'
import { NYC_VENUES } from '../lib/constants.js'

export default function AddEvent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({ title: '', artist: '', event_date: '', venue: '', notes: '' })
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

  // Apply Smart Add results to the form. Map the extracted venue onto the
  // dropdown when it matches a known venue; otherwise fall back to "Other"
  // and preserve the real name in notes so nothing is lost.
  const applyFields = (f) => {
    const match = NYC_VENUES.find(
      (v) => v.toLowerCase() === (f.venue || '').trim().toLowerCase(),
    )
    let venue = ''
    let notes = f.notes || ''
    if (f.venue) {
      if (match) {
        venue = match
      } else {
        venue = 'Other'
        notes = `Venue: ${f.venue}${notes ? `\n${notes}` : ''}`
      }
    }
    setForm({
      title: f.title || '',
      artist: f.artist || '',
      event_date: f.event_date || '',
      venue,
      notes,
    })
  }

  const toggleCrew = (id) =>
    setSelCrews((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.event_date || !form.venue) return
    setSaving(true)
    setErr('')
    try {
      // 1) Upload flyer if present.
      let flyer_url = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('flyers').upload(path, file)
        if (upErr) throw upErr
        flyer_url = supabase.storage.from('flyers').getPublicUrl(path).data.publicUrl
      }

      // 2) Insert the event.
      const { data: event, error: insErr } = await supabase
        .from('events')
        .insert({ ...form, owner_id: user.id, share_friends: shareFriends, flyer_url })
        .select()
        .single()
      if (insErr) throw insErr

      // 3) Share into selected crews.
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

  return (
    <Wrap>
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/calendar')} className="text-gray-600 hover:text-white transition-colors text-lg">
          ←
        </button>
        <h1 className="heading-type text-xl text-white">Add a Show</h1>
      </div>

      <SmartAdd onResult={applyFields} />

      <form onSubmit={submit} className="space-y-5">
        <Inp label="Event / Night Title" value={form.title} onChange={set('title')} placeholder="e.g. Superior Ingredients" required />
        <Inp label="Artist(s)" value={form.artist} onChange={set('artist')} placeholder="e.g. Dee Vault" />

        <div className="grid grid-cols-2 gap-4">
          <Inp label="Date" type="date" value={form.event_date} onChange={set('event_date')} required />
          <Sel label="Venue" value={form.venue} onChange={set('venue')} options={NYC_VENUES} />
        </div>

        <Txta label="Notes (optional)" value={form.notes} onChange={set('notes')} placeholder="Doors at 10, tickets at will call…" />

        {/* Flyer upload */}
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">Screenshot / Flyer (optional)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all hover:border-accent/40 ${
              preview ? 'border-accent/30' : 'border-white/10'
            }`}
          >
            {preview ? (
              <div>
                <img src={preview} alt="Preview" className="max-h-28 mx-auto rounded-xl object-cover mb-2" />
                <p className="text-[11px] text-gray-600">Click to change</p>
              </div>
            ) : (
              <div>
                <div className="text-2xl mb-2 opacity-40">📸</div>
                <p className="text-xs text-gray-700">Upload flyer or screenshot</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>

        {/* Audience picker */}
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-3">Who can see this?</label>
          <button
            type="button"
            onClick={() => setShareFriends((s) => !s)}
            className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 mb-2 transition-all ${
              shareFriends ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <span className="text-sm text-white">All my friends</span>
            <span className={`text-xs ${shareFriends ? 'text-accent' : 'text-gray-600'}`}>
              {shareFriends ? '✓ Shared' : 'Private'}
            </span>
          </button>

          {crews.length > 0 && (
            <div className="space-y-2">
              {crews.map((c) => {
                const on = selCrews.has(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCrew(c.id)}
                    className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 transition-all ${
                      on ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm text-white">👯 {c.name}</span>
                    <span className={`text-xs ${on ? 'text-accent' : 'text-gray-600'}`}>{on ? '✓ Shared' : 'Add'}</span>
                  </button>
                )
              })}
            </div>
          )}
          <p className="text-gray-700 text-[11px] mt-2">
            Leave everything off to keep this show private to you.
          </p>
        </div>

        {err && <p className="text-red-400 text-xs">{err}</p>}

        <div className="flex gap-3 pt-2">
          <Btn type="submit" disabled={!form.title || !form.event_date || !form.venue || saving} cls="flex-1 flex justify-center">
            {saving ? 'Adding…' : 'Add to Calendar'}
          </Btn>
          <Btn variant="ghost" onClick={() => navigate('/calendar')}>
            Cancel
          </Btn>
        </div>
      </form>
    </Wrap>
  )
}
