import InfoPage, { H2, Note } from '../components/InfoPage.jsx'

export default function Privacy() {
  return (
    <InfoPage kicker="PRIVACY" title="Privacy Policy" updated="Draft — full policy coming soon">
      <Note>
        This is a placeholder. Our complete privacy policy is being finalized and will replace this
        page. It isn't a legal agreement yet.
      </Note>

      <H2>The short version</H2>
      <p>
        To run your account, TikCal stores what you'd expect: your email, the shows you save, and the
        crews and friends you connect with. We don't sell your data.
      </p>

      <H2>Coming soon</H2>
      <p>
        The full policy will spell out exactly what we collect, how it's used and stored, who it's
        shared with, and the choices and controls you have over it.
      </p>
    </InfoPage>
  )
}
