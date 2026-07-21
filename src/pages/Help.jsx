import InfoPage, { H2, Note } from '../components/InfoPage.jsx'

export default function Help() {
  return (
    <InfoPage kicker="HELP" title="Help & support">
      <Note>A full help center is on the way. In the meantime, here are the basics.</Note>

      <H2>Adding a show</H2>
      <p>
        On your calendar, hit <strong>Add Show</strong>. Paste a ticket link, text, or a screenshot
        into Smart Add and TikCal fills in the details for you.
      </p>

      <H2>Crews & friends</H2>
      <p>
        Follow friends and join invite-only crews to see what everyone's going to. Share a show into
        a crew and it shows up on their calendar too.
      </p>

      <H2>Still stuck?</H2>
      <p>Reach out from the Contact link in the footer and we'll help you out.</p>
    </InfoPage>
  )
}
