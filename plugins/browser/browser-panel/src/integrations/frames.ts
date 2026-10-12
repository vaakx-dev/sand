import { onTimeout } from '@vaakx-dev/vrui'

const retryMs = [250, 500, 1000, 2000, 4000]

const pause = (ms: number) => new Promise<void>(resolve => onTimeout(resolve, ms))

const joined = (head: Uint8Array, tail: Uint8Array) => {
  if (!head.length) return tail
  const out = new Uint8Array(head.length + tail.length)
  out.set(head)
  out.set(tail, head.length)
  return out
}

const readFrames = async (body: ReadableStream<Uint8Array>, frame: (bytes: Uint8Array<ArrayBuffer>) => Promise<void>) => {
  const reader = body.getReader()
  let buffer: Uint8Array = new Uint8Array(0)
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    buffer = joined(buffer, value)
    while (buffer.length >= 4) {
      const length = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0)
      if (buffer.length < 4 + length) break
      const bytes = buffer.slice(4, 4 + length)
      buffer = buffer.subarray(4 + length)
      if (length) await frame(bytes)
    }
  }
}

export const streamFrames = (
  open: (signal: AbortSignal) => Promise<Response>,
  frame: (bytes: Uint8Array<ArrayBuffer>) => Promise<void>,
  ended: () => void,
) => {
  const abort = new AbortController()
  const { signal } = abort
  const run = async () => {
    let failures = 0
    while (!signal.aborted) {
      try {
        const response = await open(signal)
        if (response.ok && response.body)
          await readFrames(response.body, bytes => {
            failures = 0
            return signal.aborted ? Promise.resolve() : frame(bytes)
          })
      } catch {}
      if (signal.aborted) return
      ended()
      await pause(retryMs[Math.min(failures++, retryMs.length - 1)] ?? 1000)
    }
  }
  void run()
  return () => abort.abort()
}
