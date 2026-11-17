// Wordmark helpers shared by the static and liquid marks. LiquidWordmark is
// lazy-loaded, so these live outside it to keep the shader out of the main
// bundle.
export const BARLOW = { style: 'italic', weight: 800, family: 'Barlow' }
export const fontSpec = (face, px) => `${face.style} ${face.weight} ${px}px "${face.family}"`

// Paper's ShaderMount throws from an effect when webgl2 is missing, which
// would take down the tree; check first and keep the static mark.
let webgl2
export const hasWebGL2 = () => {
  if (webgl2 === undefined) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      webgl2 = !!gl
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      webgl2 = false
    }
  }
  return webgl2
}
