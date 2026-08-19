import InfoPage, { H2, Note } from '../components/InfoPage.jsx'
import Seo from '../components/Seo.jsx'

export default function Privacy() {
  return (
    <InfoPage kicker="PRIVACY" title="Privacy Policy" updated="Effective August 18, 2026">
      <Seo
        title="Privacy Policy"
        path="/privacy"
        description="How TikCal handles your data: what we store to run your account, and what we don't do with it."
      />

      <H2>Information we collect</H2>
      <p>
        <strong className="text-white">Account information</strong> — your email address, used to
        create and manage your account and for account-related communication.
      </p>
      <p>
        <strong className="text-white">Music listening data (Spotify)</strong> — with your
        permission, we connect to your Spotify account via Spotify's OAuth service to read your
        listening history, top artists, and saved tracks. This is used solely to match you with
        relevant concerts and personalize your recommendations. We don't post to your Spotify
        account or modify your Spotify data.
      </p>
      <p>
        <strong className="text-white">Location</strong> — with your permission, we use your
        device's approximate location to show concerts and events near you. You can deny location
        access and search by city manually instead.
      </p>
      <p>
        <strong className="text-white">Event and ticketing data</strong> — we display publicly
        available event listings sourced from third-party ticketing platforms. We don't process
        your payments; ticket purchases happen on the third-party platform's own site or app.
      </p>
      <p>
        <strong className="text-white">Crew data</strong> — if you use Crews, we store your friend
        connections, shared events, and RSVP status so you can see who's going to a show with you.
      </p>
      <p>
        <strong className="text-white">Usage data</strong> — basic app usage and diagnostic data
        (crash logs, feature usage) to improve the app.
      </p>

      <H2>How we use it</H2>
      <p>
        To run and personalize core app features (event matching, calendar sync, crew
        coordination), maintain your account and provide support, improve app performance, and
        communicate with you about your account or app updates.
      </p>

      <H2>How we share it</H2>
      <p>
        We don't sell your personal information. We share data with service providers strictly to
        operate the app — Spotify's API, our cloud hosting, ticketing data providers — under
        confidentiality obligations. We may disclose information if required by law.
      </p>

      <H2>Your choices</H2>
      <p>
        Disconnect Spotify anytime in Settings. Revoke location permission in your device's iOS
        Settings. Delete your account and its data by emailing us below.
      </p>

      <H2>Data retention</H2>
      <p>We keep your account data while your account is active. Request deletion anytime.</p>

      <H2>Children's privacy</H2>
      <p>
        TikCal isn't directed to children under 13, and we don't knowingly collect data from
        children under 13.
      </p>

      <H2>Changes to this policy</H2>
      <p>We may update this policy periodically. Material changes will be noted in-app.</p>

      <Note>
        Questions about this policy or your data? Email{' '}
        <a href="mailto:dev@tikcal.nyc" className="text-violet hover:text-white transition-colors">
          dev@tikcal.nyc
        </a>
        .
      </Note>
    </InfoPage>
  )
}
