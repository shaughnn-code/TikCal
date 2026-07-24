import { useEffect, useRef, useState } from 'react'
import { loadSpotifyIframeApi } from '../lib/spotifyEmbed.js'
import { SecLabel } from './ui.jsx'

// A Spotify embed for one entity (artist / album / track / playlist).
//
// `uri` is a Spotify URI, e.g. 'spotify:artist:4Z8W4fKeB5YxbusRsdQVPb'.
//
// Deliberately never calls ctrl.play(): browser autoplay policy (Safari above
// all) blocks programmatic playback without a gesture, and the embed already
// gives the user a play button. Triggering it here just produces a console
// error and, on some builds, a stuck player.
export default function SpotifyPreview({ uri, height = 152, className = '' }) {
  const hostRef = useRef(null) // React-owned wrapper; Spotify never touches this node
  const ctrlRef = useRef(null)
  const loadedUriRef = useRef(null) // what the controller is actually showing
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  // Read the current uri inside the create effect without making it a
  // dependency — a uri change reuses the controller (see the effect below).
  const uriRef = useRef(uri)
  uriRef.current = uri

  const hasUri = Boolean(uri)

  useEffect(() => {
    if (!hasUri) return
    let cancelled = false
    setStatus('loading')

    // createController *replaces* the element it is given with an iframe. Hand
    // it a throwaway node we create ourselves rather than a JSX-rendered one:
    // if React still believed it owned that node it would try to remove a node
    // that is no longer there on unmount and throw NotFoundError.
    const target = document.createElement('div')
    hostRef.current?.appendChild(target)

    loadSpotifyIframeApi()
      .then((IFrameAPI) => {
        if (cancelled) return
        const initialUri = uriRef.current
        IFrameAPI.createController(target, { uri: initialUri, width: '100%', height }, (ctrl) => {
          // The controller callback is async and uncancellable, so the
          // component may already be gone by now. Destroy on arrival —
          // otherwise this iframe outlives the route and they pile up.
          if (cancelled) {
            ctrl.destroy()
            return
          }
          ctrlRef.current = ctrl
          loadedUriRef.current = initialUri
          setStatus('ready')
        })
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      ctrlRef.current?.destroy()
      ctrlRef.current = null
      loadedUriRef.current = null
      target.remove() // no-op once destroy() has taken the iframe with it
    }
  }, [hasUri, height])

  // Swap entity in place. Rebuilding the controller would flash the row and
  // refetch the whole embed for what the API handles in one call.
  useEffect(() => {
    const ctrl = ctrlRef.current
    if (status !== 'ready' || !ctrl || !uri || uri === loadedUriRef.current) return
    loadedUriRef.current = uri
    // The embed API has shipped this under two names; loadUri (string) is the
    // documented one, loadEntity (options object) appears on other builds.
    // Feature-detect rather than bet on which one this script serves.
    if (typeof ctrl.loadUri === 'function') ctrl.loadUri(uri)
    else ctrl.loadEntity?.({ uri })
  }, [uri, status])

  if (!hasUri) return null

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-white/[0.07] bg-panel/70 ${className}`}
      style={{ height }}
      aria-busy={status === 'loading'}
    >
      {/* Reserved-height host. Faded rather than unmounted so the iframe can
          size itself before it becomes visible — display:none would give it a
          zero-height box to lay out in. */}
      <div
        ref={hostRef}
        className={`h-full w-full transition-opacity duration-300 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />

      {status === 'loading' && (
        // Skeleton mirroring the embed's art + two-line layout, so the shape
        // doesn't change when the real thing lands.
        <div
          className="absolute inset-0 flex items-center gap-3 px-3 animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        >
          <div className="aspect-square h-[70%] shrink-0 rounded-md bg-violet/10" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-1/2 rounded bg-white/[0.08]" />
            <div className="h-2 w-1/3 rounded bg-white/[0.05]" />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center px-3">
          <SecLabel className="text-slate-500">Preview unavailable</SecLabel>
        </div>
      )}
    </div>
  )
}
