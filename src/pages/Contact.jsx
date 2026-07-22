import InfoPage from '../components/InfoPage.jsx'

const EMAIL = 'dev@tikcal.nyc'

export default function Contact() {
  return (
    <InfoPage kicker="CONTACT" title="Get in touch">
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
    </InfoPage>
  )
}
