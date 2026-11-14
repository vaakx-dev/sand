import libheif, { type HeifImage } from 'libheif-js/libheif-wasm/libheif-bundle.mjs'
import { type Decoding, sizeProblem } from './picture'

const shown = (image: HeifImage, width: number, height: number) =>
  new Promise<Uint8ClampedArray<ArrayBuffer> | undefined>(resolve =>
    image.display({ data: new Uint8ClampedArray(width * height * 4), width, height }, pixels => resolve(pixels?.data)),
  )

const decodeHeic = async (buffer: ArrayBuffer): Promise<Decoding> => {
  const images = new (libheif().HeifDecoder)().decode(new Uint8Array(buffer))
  const image = images.find(found => found.is_primary()) ?? images[0]
  if (!image) return { error: "it holds no image the viewer can read" }
  const width = image.get_width()
  const height = image.get_height()
  const tooLarge = sizeProblem(width, height)
  if (tooLarge) return { error: tooLarge }
  const rgba = await shown(image, width, height)
  return rgba ? { picture: { width, height, pages: 1, rgba } } : { error: "its image data couldn't be decoded" }
}

export { decodeHeic }
