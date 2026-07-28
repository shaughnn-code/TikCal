// Pure SEO field builders — no DOM, no I/O (see CLAUDE.md conventions).
// Consumed by <Seo> (src/components/Seo.jsx), which feeds these into
// react-helmet-async to manage the per-route <head>.
//
// Split of responsibility (see index.html):
//   - Helmet owns the route-varying, ranking-critical tags: <title>,
//     <meta name="description">, <link rel="canonical">.
//   - index.html keeps the static social baseline (og/twitter/JSON-LD at
//     homepage values). Interior deep-link social unfurls therefore show the
//     homepage card until we add build-time prerendering.

export const SITE_NAME = 'TikCal'
export const SITE_URL = 'https://tikcal.nyc'
export const HOME_TITLE = 'TikCal — NYC Concert Discovery & Group Availability'

// Home title stands alone; interior pages get " — TikCal" appended so the brand
// rides every tab and SERP entry. Pass { home: true } to skip the suffix.
export function pageTitle(title, { home = false } = {}) {
  if (!title) return HOME_TITLE
  if (home) return title
  return `${title} — ${SITE_NAME}`
}

// Absolute canonical URL for a route path. Normalizes to a leading slash,
// collapses accidental double slashes, and drops a trailing slash (except root)
// so the same page never canonicalizes to two different URLs.
export function canonicalUrl(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`
  const clean = p.replace(/\/{2,}/g, '/').replace(/(.+)\/$/, '$1')
  return `${SITE_URL}${clean}`
}

// Everything <Seo> needs for a single route.
export function buildSeo({ title, description, path = '/', home = false } = {}) {
  return {
    title: pageTitle(title, { home }),
    description: description || '',
    canonical: canonicalUrl(path),
  }
}
