import type { LLMEvent } from '@sand/protocol'
import { detailOf } from '../errors'
import type { ShareLine } from './info'

const heartbeat = 5_000

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const streamLines = (events: (signal: AbortSignal) => AsyncIterable<LLMEvent>, signal: AbortSignal) => {
  const upstream = new AbortController()
  const stop = () => upstream.abort()
  signal.addEventListener('abort', stop, { once: true })
  const encoder = new TextEncoder()
  let closed = false
  let beat: ReturnType<typeof setInterval> | undefined

  const finish = () => {
    closed = true
    clearInterval(beat)
    signal.removeEventListener('abort', stop)
  }

  const body = new ReadableStream<Uint8Array>({
    async start(out) {
      const line = (value: ShareLine) => {
        if (closed) return
        try {
          out.enqueue(encoder.encode(`${JSON.stringify(value)}\n`))
        } catch {
          closed = true
        }
      }
      beat = setInterval(() => line({ type: 'ping' }), heartbeat)
      try {
        for await (const event of events(upstream.signal)) {
          if (closed) break
          line(event)
        }
      } catch (error) {
        const detail = detailOf(error)
        if (!upstream.signal.aborted) line({ type: 'error', message: message(error), ...(detail && { detail }) })
      }
      const open = !closed
      finish()
      if (open) out.close()
    },
    cancel() {
      finish()
      stop()
    },
  })

  return new Response(body, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } })
}
