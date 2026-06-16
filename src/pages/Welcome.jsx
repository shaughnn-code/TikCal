import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

// First-run welcome: blue spotlight beams from the corner, the TikCal wordmark
// lights up, and the disco-ball mascot rises from the bottom to stand on it.
export default function Welcome() {
  const { updateProfile } = useAuth()
  const navigate = useNavigate()
  const [on, setOn] = useState(false)
  const left = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 120)
    return () => clearTimeout(t)
  }, [])

  const finish = () => {
    if (left.current) return
    left.current = true
    updateProfile({ seen_intro: true }) // fire-and-forget; don't block the transition
    navigate('/calendar', { replace: true })
  }

  return (
    <div className={`wel-scene ${on ? 'on' : ''}`}>
      <div className="wel-floor" />
      <div className="wel-spot" />
      <div className="wel-flare" />
      <button className="wel-skip" onClick={finish}>SKIP →</button>

      <div className="wel-col">
        <img className="wel-mascot" src="/discoball.png" alt="TikCal disco-ball mascot" />
        <span className="logo-3d wel-logo">TikCal</span>
        <div className="wel-tagline">EVERY SOURCE · ONE CALENDAR</div>
      </div>

      <div className="wel-cta">
        <button className="wel-enter" onClick={finish}>ENTER →</button>
      </div>
    </div>
  )
}
