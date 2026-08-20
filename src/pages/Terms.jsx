import InfoPage, { H2, Note } from '../components/InfoPage.jsx'
import Seo from '../components/Seo.jsx'

export default function Terms() {
  return (
    <InfoPage kicker="TERMS" title="Terms of Service" updated="Effective August 20, 2026">
      <Seo
        title="Terms of Service"
        path="/terms"
        description="The terms for using TikCal to track and share shows with your crew."
      />

      <H2>Using TikCal</H2>
      <p>
        TikCal helps you track shows, sync your calendar, and coordinate plans with friends. By
        creating an account or using the app, you agree to these terms. If you don't agree, don't
        use TikCal.
      </p>
      <p>
        You must be at least 13 years old to use TikCal. You're responsible for the activity on
        your account and for keeping your login credentials secure.
      </p>

      <H2>Your content</H2>
      <p>
        You keep ownership of the events, notes, and other content you add to TikCal. By posting
        it, you let us store and display it back to you and to the crew members and friends you
        choose to share it with, so the app can work. Don't post anything illegal, harassing, or
        that you don't have the right to share.
      </p>

      <H2>Event and ticketing data</H2>
      <p>
        TikCal displays publicly available event listings sourced from third-party platforms
        (including Ticketmaster, Resident Advisor, and DICE). We don't sell tickets and don't
        process ticket payments — purchases happen on the third-party platform's own site or app,
        under that platform's own terms. We aren't responsible for the accuracy of listings we
        didn't create, or for your transactions with those platforms.
      </p>

      <H2>Third-party connections</H2>
      <p>
        Features like Spotify matching and Google Calendar sync connect to services you
        authorize. Your use of those services is governed by their own terms — disconnecting them
        in TikCal doesn't affect your account with the third party.
      </p>

      <H2>Acceptable use</H2>
      <p>
        Don't misuse TikCal: no scraping or automated access outside what we provide, no
        attempting to break or bypass the service's security, no impersonating others, and no
        using the app to harass or harm other users. We can suspend or terminate accounts that
        violate this.
      </p>

      <H2>Availability and changes</H2>
      <p>
        TikCal is provided "as is." We work to keep it running reliably but don't guarantee
        uninterrupted access, and features may change or be discontinued as the app evolves.
      </p>

      <H2>Liability</H2>
      <p>
        To the extent permitted by law, TikCal isn't liable for indirect or consequential damages
        arising from your use of the app, including missed events, third-party ticketing issues,
        or data loss. Nothing here limits liability where the law doesn't allow it.
      </p>

      <H2>Ending your account</H2>
      <p>
        You can delete your account anytime by emailing us below. We may suspend or terminate
        accounts that violate these terms.
      </p>

      <H2>Changes to these terms</H2>
      <p>We may update these terms periodically. Material changes will be noted in-app.</p>

      <Note>
        Questions about these terms? Email{' '}
        <a href="mailto:dev@tikcal.nyc" className="text-violet hover:text-white transition-colors">
          dev@tikcal.nyc
        </a>
        .
      </Note>
    </InfoPage>
  )
}
