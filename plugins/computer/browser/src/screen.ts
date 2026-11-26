import { fitInside, type Size } from '@sand/computers/contract'
import type { Viewport } from './input'
import type { Call } from './tabs'

const pngSize = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

const viewportOf = async (call: Call): Promise<Viewport> => {
  const { cssVisualViewport } = await call<{ cssVisualViewport: { clientWidth: number; clientHeight: number } }>('Page.getLayoutMetrics')
  return { width: cssVisualViewport.clientWidth, height: cssVisualViewport.clientHeight }
}

const shrink = async (png: Uint8Array, fit: Size | undefined) => {
  const size = pngSize(png)
  const fitted = fitInside(size, fit)
  if (fitted.width === size.width) return png
  return new Bun.Image(png).resize(fitted.width, fitted.height).png().bytes()
}

const capture = async (call: Call, fit: Size | undefined) => {
  const { data } = await call<{ data: string }>('Page.captureScreenshot', { format: 'png' })
  return shrink(Buffer.from(data, 'base64'), fit)
}

export { capture, pngSize, viewportOf }
