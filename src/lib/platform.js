// Capacitor's native runtime injects a global `window.Capacitor` object with
// getPlatform() at load time, independent of whether @capacitor/core is
// installed as an npm dependency yet -- so this works even before the native
// shells (ios/, android/) are properly initialized.
export function getPlatform() {
  if (typeof window !== 'undefined' && typeof window.Capacitor?.getPlatform === 'function') {
    return window.Capacitor.getPlatform()
  }
  return 'web'
}
