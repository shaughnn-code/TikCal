import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Inp, Txta, Btn } from '../components/ui.jsx'
import { TotemSel } from '../components/TotemSel.jsx'
import { VenuePicker } from '../components/VenuePicker.jsx'

export default function Setup() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [venue, setVenue] = useState(profile?.favorite_venue || '')
  const [totem, setTotem] = useState(profile?.totem || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !totem || !venue) return
    setSaving(true)
    setErr('')
    const { error } = await updateProfile({
      name: name.trim(),
      bio,
      favorite_venue: venue,
      totem,
      setup_complete: true,
    })
    setSaving(false)
    if (error) return setErr(error)
    navigate('/calendar', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="heading-type text-2xl text-white mb-2">Set up your profile</h1>
          <p className="text-gray-600 text-sm">Tell the crew who you are</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Inp label="Name" value={name} onChange={setName} placeholder="Your name" required />
          <Txta label="Bio (optional)" value={bio} onChange={setBio} placeholder="What's your vibe?" rows={2} />
          <VenuePicker label="Favorite NYC Venue" value={venue} onChange={setVenue} placeholder="Type in your favorite venue" />
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-3">Your Totem</label>
            <TotemSel value={totem} onChange={setTotem} />
          </div>
          {err && <p className="text-red-400 text-xs text-center">{err}</p>}
          <Btn type="submit" disabled={!name.trim() || !totem || !venue || saving} cls="w-full flex justify-center mt-2">
            {saving ? 'Saving…' : "Let's go →"}
          </Btn>
        </form>
      </div>
    </div>
  )
}
