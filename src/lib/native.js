import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { isNative } from './platform.js'

// Native chrome setup. Everything here is a no-op on the web build — the
// plugins have no browser implementation and throw "not implemented", so we
// gate on isNative() and still swallow errors: none of this is worth taking
// the app down for.
//
// The same values live in capacitor.config.json, which the plugins read at
// native load (so the very first frame is already right). These calls re-assert
// them after the WebView is up, which is where the config alone is unreliable —
// notably iOS, which can reset the bar style across a system appearance change.
export async function initNative() {
  if (!isNative()) return

  try {
    // Style.Dark reads backwards: it means "content for a dark background",
    // i.e. light glyphs. TikCal is near-black everywhere, so it never flips.
    await StatusBar.setStyle({ style: Style.Dark })
    // Android draws an actual status-bar background; iOS ignores this.
    await StatusBar.setBackgroundColor({ color: '#0b0b11' })
    // Keep the bar in its own strip instead of floating over the WebView. The
    // safe-area padding in src/index.css is additive, so the layout is correct
    // either way — this just makes the result predictable.
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {
    /* plugin unavailable on this platform — leave the system default */
  }

  try {
    // capacitor.config.json also auto-hides after launchShowDuration as a
    // safety net; this cuts the splash as soon as React has actually painted.
    await SplashScreen.hide()
  } catch {
    /* no splash to hide */
  }
}
