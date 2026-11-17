import { withAlpha } from '../lib/constants.js'
import { isSafeUrl } from '../lib/safeUrl.js'
import { Icon } from './icons.jsx'

// Event-detail header: a stage seen from the floor. Light beams fan up from
// behind a crowd silhouette, tinted with the event's own hue (crew color or
// artist hash, via getEventAccent) against the aurora brand bloom, so the hero
// still reads as "that crew's night" without inventing new chrome colors.
// A flyer, when the event has one, replaces the drawn stage as the backdrop.
const AURORA = '#c04bff'

const CROWD =
  'M0 140V92c10-6 16-24 26-24s14 16 20 18c6-14 12-36 24-36s14 22 18 30c8-8 10-20 20-20 12 0 12 16 18 22 8-24 18-48 30-48s16 26 20 34c6-10 12-18 22-18s12 14 18 20c8-18 14-40 28-40 12 0 16 20 20 30 6-6 12-14 20-14 12 0 14 18 20 22 8-12 14-28 26-28s14 18 18 26c6-4 10-10 18-10 10 0 12 14 16 18 6-6 10-14 18-14 8 0 10 8 13 12V140Z'
// Raised arms / phones held up, drawn as thin wedges above the crowd line.
const ARMS = 'M58 70l-8-40 6-2 9 38z M292 58l6-42 6 1-4 42z M170 60l-2-46h6l2 46z'

export const StageHero = ({ event, accent, kicker, onBack }) => {
  const hue = accent?.color || AURORA
  const flyer = isSafeUrl(event.flyer_url) ? event.flyer_url : null

  const stage = {
    background: [
      `radial-gradient(70% 45% at 50% 100%, ${withAlpha(hue, 0.55)}, transparent 70%)`,
      `radial-gradient(60% 70% at 50% 0%, ${withAlpha(hue, 0.4)}, transparent 70%)`,
      `radial-gradient(50% 60% at 12% 40%, ${withAlpha(AURORA, 0.45)}, transparent 70%)`,
      `radial-gradient(40% 50% at 92% 50%, ${withAlpha(AURORA, 0.3)}, transparent 70%)`,
      '#0a0a12',
    ].join(','),
  }
  const beams = {
    background: `conic-gradient(from 180deg at 50% 102%, transparent 140deg, ${withAlpha(hue, 0.35)} 150deg, transparent 154deg, transparent 166deg, ${withAlpha(AURORA, 0.4)} 172deg, transparent 176deg, transparent 184deg, ${withAlpha(hue, 0.45)} 188deg, transparent 192deg, transparent 204deg, ${withAlpha(AURORA, 0.35)} 210deg, transparent 214deg)`,
    filter: 'blur(1.5px)',
  }

  return (
    <header className="relative -mx-4 sm:mx-0 -mt-8 sm:mt-0 mb-6 h-[320px] sm:h-[340px] overflow-hidden sm:rounded-2xl sm:border sm:border-white/[0.06]">
      {flyer ? (
        <img src={flyer} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={stage} aria-hidden="true">
          <div className="absolute inset-0" style={beams} />
          <svg viewBox="0 0 393 140" preserveAspectRatio="none" className="absolute left-0 bottom-16 w-full h-[110px]">
            <path fill="#07070b" d={CROWD} />
            <path fill="#07070b" d={ARMS} />
          </svg>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-[#07070b]" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" aria-hidden="true" />

      <button
        onClick={onBack}
        aria-label="Back"
        className="absolute top-4 left-4 w-11 h-11 rounded-full flex items-center justify-center text-white bg-ink/55 backdrop-blur border border-white/10 hover:border-violet/50 transition-colors"
      >
        <Icon name="arrow-left" size={20} />
      </button>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
        {kicker && (
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-200">
            <span className="w-2 h-2 rounded-full" style={{ background: hue, boxShadow: `0 0 10px ${hue}` }} />
            {kicker}
          </div>
        )}
        <h1 className="font-heading font-extrabold text-[34px] sm:text-[40px] leading-[1.05] text-white mt-2 break-words">
          {event.title}
        </h1>
        {event.artist && event.artist !== event.title && (
          <p className="text-slate-300 text-base mt-1.5">{event.artist}</p>
        )}
      </div>
    </header>
  )
}
