import { Browser } from '@capacitor/browser'
import { isNative } from './platform.js'

// Send the user to a provider's consent screen.
//
// On the web this is the redirect it has always been. On native it must NOT be:
// Google refuses OAuth inside an embedded WebView (`disallowed_useragent`), and
// pointing window.location at the consent page would also blow away the running
// app. So the consent page opens in the system browser — SFSafariViewController
// on iOS, Chrome Custom Tabs on Android — and the callback bounces back in
// through the tikcal:// deep link that DeepLinkHandler picks up.
//
// `start` is one of the startXConnect functions from db.js; it resolves to the
// provider's authorize URL.
//
// Resolves true once the user is back in the app, so the caller can clear its
// pending state — that covers both finishing the flow and swiping the sheet
// away. Resolves false on web, where the page is already navigating away and
// there is nothing to come back from.
export async function openConnect(start) {
  const url = await start()

  if (!isNative()) {
    window.location.href = url
    return false
  }

  await Browser.open({ url })
  await new Promise((resolve) => {
    let handle = null
    let finished = false
    const done = () => {
      finished = true
      handle?.remove()
      resolve()
    }
    // The sheet can close before addListener resolves, hence the flag.
    Browser.addListener('browserFinished', done).then((h) => {
      handle = h
      if (finished) h.remove()
    })
  })
  return true
}
