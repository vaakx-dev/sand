import { listen } from '@vaakx-dev/vrui'
import type { Decoding } from './picture'

interface Decoded {
  image: ImageBitmap
  width: number
  height: number
  pages: number
}

type Reply = Decoded | { error: string }

type Decode = (buffer: ArrayBuffer) => Promise<Decoding>

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

const bitmapOf = async (decoding: Decoding): Promise<Reply> => {
  if ('error' in decoding) return decoding
  const { width, height, pages, rgba } = decoding.picture
  return { image: await createImageBitmap(new ImageData(rgba, width, height)), width, height, pages }
}

const reply = async (decode: Decode, buffer: ArrayBuffer) => {
  const answered = await decode(buffer).then(bitmapOf, (error: unknown) => ({ error: messageOf(error) }))
  self.postMessage(answered, { transfer: 'image' in answered ? [answered.image] : [] })
}

const answer = (decode: Decode) => listen(self, 'message', (event: MessageEvent<ArrayBuffer>) => void reply(decode, event.data))

export { answer, type Decoded, type Reply }
