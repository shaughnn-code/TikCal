import { useNavigate } from 'react-router-dom'
import { GridBg, HudBox, Kicker, Btn } from './ui.jsx'

// Drop-in placeholder for routes/sections that aren't built yet. The disco
// ball assembles from a hex-tube burst into a mirror ball and back — reads as
// "still under construction" rather than a dead end.
export const UnderConstruction = ({ title = "This one's still spinning up", note, backTo = -1 }) => {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <GridBg lite />
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        <HudBox tone="ice" hero className="p-3 mb-7">
          <video
            className="uc-vid w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded"
            poster="/media/discoball-build-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/media/discoball-build-loop.mp4" type="video/mp4" />
            <source src="/media/discoball-build-loop.webm" type="video/webm" />
          </video>
        </HudBox>
        <Kicker className="mb-3">▸ Under construction</Kicker>
        <h1 className="font-display font-bold text-2xl text-[#e8f4f8] mb-2 text-balance">{title}</h1>
        <p className="text-sm text-slate-400 mb-7">
          {note || "We're still building this part of TikCal. Check back soon."}
        </p>
        <Btn variant="ghost" onClick={() => navigate(backTo)}>← Back</Btn>
      </div>
    </div>
  )
}

export default UnderConstruction
