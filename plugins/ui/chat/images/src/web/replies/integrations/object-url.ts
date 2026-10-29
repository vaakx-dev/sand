import { img } from '@vaakx-dev/vrui'

export interface DecodedImage {
  src: string
  width: number
  height: number
}

export const decodedImage = async (blob: Blob): Promise<DecodedImage> => {
  const src = URL.createObjectURL(blob)
  const probe = img({ src, decoding: 'async' })
  try {
    await probe.decode()
    return { src, width: probe.naturalWidth, height: probe.naturalHeight }
  } catch (error) {
    URL.revokeObjectURL(src)
    throw error
  }
}

export const releaseImage = (src: string) => URL.revokeObjectURL(src)
