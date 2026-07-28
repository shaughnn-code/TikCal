import { useEffect } from 'react'
import { buildSeo } from '../lib/seo.js'

// Finds an existing <head> element or creates one. Returns [element, created].
function ensure(selector, make) {
  const found = document.head.querySelector(selector)
  if (found) return [found, false]
  const el = make()
  document.head.appendChild(el)
  return [el, true]
}

// Per-route <head> manager. Renders no DOM. On mount / prop change it sets
// document.title and mutates the SINGLE existing <link rel="canonical"> and
// <meta name="description"> (the static homepage baseline in index.html) rather
// than appending new nodes — so there is never a duplicate or conflicting
// canonical. On unmount it restores the previous values, so leaving a public
// page for an app route reverts to the homepage baseline.
//
// Scope is deliberately narrow: only the route-varying, ranking-critical tags.
// og/twitter/JSON-LD stay static in index.html — see src/lib/seo.js.
//
// A dependency-free effect is used instead of react-helmet-async, which no-ops
// under React 18 StrictMode (its v2 line has an open bug there).
//
// Props: title, description, path ("/about"), home (skip the brand suffix).
export default function Seo({ title, description, path, home = false }) {
  const { title: t, description: d, canonical } = buildSeo({ title, description, path, home })

  useEffect(() => {
    const prevTitle = document.title
    document.title = t

    const [link, linkMade] = ensure('link[rel="canonical"]', () => {
      const l = document.createElement('link')
      l.setAttribute('rel', 'canonical')
      return l
    })
    const prevHref = link.getAttribute('href')
    link.setAttribute('href', canonical)

    let meta = null
    let prevDesc = null
    let metaMade = false
    if (d) {
      ;[meta, metaMade] = ensure('meta[name="description"]', () => {
        const m = document.createElement('meta')
        m.setAttribute('name', 'description')
        return m
      })
      prevDesc = meta.getAttribute('content')
      meta.setAttribute('content', d)
    }

    return () => {
      document.title = prevTitle
      if (linkMade) link.remove()
      else if (prevHref !== null) link.setAttribute('href', prevHref)
      if (meta) {
        if (metaMade) meta.remove()
        else if (prevDesc !== null) meta.setAttribute('content', prevDesc)
      }
    }
  }, [t, d, canonical])

  return null
}
