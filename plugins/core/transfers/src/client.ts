import { uuid } from '@sand/util'
import { chunkBytes, chunkCount, chunkUrl, type ChunkedFile, type PcFetch } from './chunks'

export interface Resumable {
  transfer: string
  arrived: Set<number>
}

export interface UploadOptions {
  progress?: (bytes: number) => void
  signal?: AbortSignal
  resumable?: Resumable
}

class Refused extends Error {}

const ATTEMPTS = 4

const FIRST_DELAY_MS = 500

const CHUNKS_AT_ONCE = 4

const FAST_CHUNK_MS = 3_000

const retried = (status: number) => status >= 500 || status === 408 || status === 429

const pause = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const done = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', done)
      resolve()
    }, ms)
    signal?.addEventListener('abort', done, { once: true })
  })

const post = async (to: PcFetch, url: string, body: Blob, signal?: AbortSignal) => {
  signal?.throwIfAborted()
  const response = await to(url, { method: 'POST', body, ...(signal && { signal }) })
  if (response.ok) return
  const message = (await response.text()) || `the PC answered ${response.status}`
  throw retried(response.status) ? new Error(message) : new Refused(message)
}

const postWithRetries = async (to: PcFetch, url: string, body: Blob, signal?: AbortSignal) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await post(to, url, body, signal)
    } catch (error) {
      if (signal?.aborted || error instanceof Refused || attempt === ATTEMPTS) throw error
      await pause(FIRST_DELAY_MS * 2 ** (attempt - 1), signal)
    }
  }
}

const sendSteadily = (chunks: number, send: (index: number) => Promise<void>) =>
  new Promise<void>((resolve, reject) => {
    let next = 0
    let running = 0
    let done = 0
    let allowed = 1
    let failed = false
    const pump = () => {
      if (done === chunks) return resolve()
      while (!failed && running < allowed && next < chunks) void start(next++)
    }
    const start = async (index: number) => {
      running++
      const startedMs = performance.now()
      try {
        await send(index)
      } catch (error) {
        failed = true
        return reject(error)
      }
      running--
      done++
      allowed = performance.now() - startedMs < FAST_CHUNK_MS ? CHUNKS_AT_ONCE : 1
      pump()
    }
    pump()
  })

const sentBytes = (resumable: Resumable, size: number) => Math.min(resumable.arrived.size * chunkBytes, size)

export const uploadBlob = async (to: PcFetch, blob: Blob, { progress, signal, resumable = { transfer: uuid(), arrived: new Set() } }: UploadOptions = {}): Promise<ChunkedFile> => {
  const file = { transfer: resumable.transfer, size: blob.size, chunks: chunkCount(blob.size) }
  const send = async (index: number) => {
    if (resumable.arrived.has(index)) return
    await postWithRetries(to, chunkUrl(file, index), blob.slice(index * chunkBytes, (index + 1) * chunkBytes), signal)
    resumable.arrived.add(index)
    progress?.(sentBytes(resumable, blob.size))
  }
  progress?.(sentBytes(resumable, blob.size))
  await sendSteadily(file.chunks, send)
  return file
}
