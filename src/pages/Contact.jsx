import InfoPage from '../components/InfoPage.jsx'
import Seo from '../components/Seo.jsx'

const EMAIL = 'hello@tikcal.nyc'

// Specific inboxes, so a message reaches the right place first time.
const OTHER = [
  { label: 'Help with your account', email: 'support@tikcal.nyc' },
  { label: 'Report abuse or a safety issue', email: 'support@tikcal.nyc' },
  { label: 'Privacy and data deletion', email: 'privacy@tikcal.nyc' },
  { label: 'Security vulnerabilities', email: 'security@tikcal.nyc' },
]

export default function Contact() {
  return (
    <InfoPage kicker="CONTACT" title="Get in touch">
      <Seo
        title="Contact"
        path="/contact"
        description="Questions, feedback, or a ticket source we should support? Get in touch with the TikCal team."
      />
      <p>
        Questions, feedback, or a ticket source we should support? We'd love to hear from you.
      </p>

      <div>
        <div className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase mb-2">Email us</div>
        {/* Clicking here opens the visitor's mail app — but only from this page,
            never straight off the footer link. */}
        <a
          href={`mailto:${EMAIL}`}
          className="inline-flex items-center rounded-xl border border-violet/30 bg-violet/[0.08] px-4 py-3 font-mono text-[15px] text-violet hover:bg-violet/[0.15] focus-visible:bg-violet/[0.15] focus-visible:outline-none transition-colors"
        >
          {EMAIL}
        </a>
      </div>

      <ul className="space-y-2 text-sm">
        {OTHER.map((o) => (
          <li key={o.label} className="flex flex-wrap gap-x-2">
            <span className="text-slate-400">{o.label}:</span>
            <a href={`mailto:${o.email}`} className="text-violet hover:text-white transition-colors">
              {o.email}
            </a>
          </li>
        ))}
      </ul>
    </InfoPage>
  )
}
