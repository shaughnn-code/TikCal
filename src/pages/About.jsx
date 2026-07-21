import InfoPage, { H2 } from '../components/InfoPage.jsx'

export default function About() {
  return (
    <InfoPage kicker="ABOUT" title="One calendar for every night out.">
      <p>
        TikCal pulls every show you're tracking — across every ticket source — into a single
        calendar, then lets you see what your crew is hitting so you never miss a night out.
      </p>

      <H2>Why we built it</H2>
      <p>
        Tickets live in a dozen apps and inboxes. Your friends' plans live somewhere else entirely.
        TikCal is the one place they come together, so making plans is about deciding, not digging.
      </p>

      <H2>What's next</H2>
      <p>
        We're just getting started. Have an idea or a source we should support? We'd love to hear it.
      </p>
    </InfoPage>
  )
}
