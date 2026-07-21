import InfoPage, { H2, Note } from '../components/InfoPage.jsx'

export default function Terms() {
  return (
    <InfoPage kicker="TERMS" title="Terms of Service" updated="Draft — full terms coming soon">
      <Note>
        This is a placeholder. Our complete terms of service are being finalized and will replace
        this page. It isn't a binding agreement yet.
      </Note>

      <H2>The short version</H2>
      <p>
        Use TikCal to track and share shows with your crew. Be decent to other people, and don't
        misuse or try to break the service.
      </p>

      <H2>Coming soon</H2>
      <p>
        The full terms will cover your account, acceptable use, content and liability, and how either
        of us can end the agreement.
      </p>
    </InfoPage>
  )
}
