import type { MediaRef } from '../contract'

export interface Size {
  width: number
  height: number
}

const sharpest = 3

export const sizeOf = (media?: Pick<MediaRef, 'width' | 'height'>): Size | undefined =>
  media?.width && media.height ? { width: media.width, height: media.height } : undefined

export const boxWidth = ({ width, height }: Size, maxHeight?: number) =>
  `${maxHeight ? Math.min(width, Math.floor((maxHeight * width) / height)) : width}px`

export const boxStyle = (size: Size, maxHeight?: number) => ({ width: boxWidth(size, maxHeight), aspectRatio: `${size.width} / ${size.height}` })

export const scaledSrc = (src: string, height?: number, maxHeight?: number) => {
  if (!height || !maxHeight) return src
  const pixels = Math.ceil(maxHeight * Math.min(globalThis.devicePixelRatio || 1, sharpest))
  if (pixels >= height) return src
  const url = new URL(src)
  url.searchParams.set('h', String(pixels))
  return url.href
}
