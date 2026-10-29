import type { MediaRef } from '@sand/chats/contract'
import { setStyle } from '@vaakx-dev/vrui'

type Measured = Pick<MediaRef, 'width' | 'height'>

const sharpest = 3

export const reserve = (image: HTMLImageElement, { width, height }: Measured) => {
  if (!width || !height) return
  if (!image.hasAttribute('width')) {
    image.width = width
    image.height = height
  }
  setStyle(image, { aspectRatio: `${width} / ${height}` })
}

export const placeholder = ({ width, height }: Measured) => {
  if (!width || !height) return undefined
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"/>`)}`
}

export const pixelHeight = ({ height }: Measured, maxHeight?: number) => {
  if (!height || !maxHeight) return undefined
  const pixels = Math.ceil(maxHeight * Math.min(globalThis.devicePixelRatio || 1, sharpest))
  return pixels < height ? pixels : undefined
}
