import { extensionOf, type OpenFile } from '@sand/file-viewer/contract'
import { bytes } from '@sand/util'
import { listen } from '@vaakx-dev/vrui'
import { type Decoder, decoderUrl } from '../contract'
import type { Decoded, Reply } from './decoder/answer'
import { MAX_FILE_BYTES } from './decoder/picture'

const HEIF_EXTENSIONS = new Set(['heic', 'heif'])

const decoderOf = (name: string): Decoder => (HEIF_EXTENSIONS.has(extensionOf(name)) ? 'heic' : 'tiff')

const replyOf = (worker: Worker, buffer: ArrayBuffer) =>
  new Promise<Reply>((resolve, reject) => {
    listen(worker, 'message', (event: MessageEvent<Reply>) => resolve(event.data))
    listen(worker, 'error', () => reject(new Error("the image decoder didn't load")))
    worker.postMessage(buffer, [buffer])
  })

const decoded = async (file: OpenFile): Promise<Decoded> => {
  if (file.size > MAX_FILE_BYTES) throw new Error(`it is ${bytes(file.size)}, and the viewer opens images up to ${bytes(MAX_FILE_BYTES)}`)
  const worker = new Worker(decoderUrl(decoderOf(file.name)), { type: 'module' })
  const reply = await file
    .blob()
    .then(blob => blob.arrayBuffer())
    .then(buffer => replyOf(worker, buffer))
    .finally(() => worker.terminate())
  if ('error' in reply) throw new Error(reply.error)
  return reply
}

export { decoded }
