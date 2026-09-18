import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { isNative, routeFromDeepLink } from '../lib/platform.js'

// Turns inbound deep links into in-app navigation. Today that's the OAuth
// callbacks bouncing back from the system browser (tikcal://profile?google=…),
// which the target pages already know how to read off the query string.
//
// Renders nothing; mounted once inside the Router so it can navigate. No-op on
// web, where these links never arrive.
export default function DeepLinkHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isNative()) return

    let handle
    let cancelled = false

    CapApp.addListener('appUrlOpen', ({ url }) => {
      // The consent page is still sitting on top of the app — dismiss it even
      // if the link turns out not to be ours, or the user is left staring at a
      // finished browser sheet with no way back.
      Browser.close().catch(() => {})
      const route = routeFromDeepLink(url)
      if (route) navigate(route, { replace: true })
    }).then((h) => {
      // The listener resolves async; if we already unmounted, drop it now.
      if (cancelled) h.remove()
      else handle = h
    })

    return () => {
      cancelled = true
      handle?.remove()
    }
  }, [navigate])

  return null
}
