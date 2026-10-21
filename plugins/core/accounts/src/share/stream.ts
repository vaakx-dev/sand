import type { LLMEvent } from '../contract'
import { errorMessage } from '@sand/util'
import { detailOf } from '../errors'
import type { ShareLine } from './info'

const heartbeat = 5_000

const errorLine = (error: unknown): ShareLine => {
  const detail = detailOf(error)
  return { type: 'error', message: errorMessage(error), ...(detail && { detail }) }
}

export const streamLines = (events: (signal: AbortSignal) => AsyncIterable<LLMEvent>, signal: AbortSignal) => {
  const cancelled = new AbortController()
  const upstream = AbortSignal.any([signal, cancelled.signal])
  const encoder = new TextEncoder()
  let closed = false
  let beat: ReturnType<typeof setInterval> | undefined

  const finish = () => {
    closed = true
    clearInterval(beat)
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
        for await (const event of events(upstream)) {
          if (closed) break
          line(event)
        }
      } catch (error) {
        if (!upstream.aborted) line(errorLine(error))
      }
      const open = !closed
      finish()
      if (open) out.close()
    },
    cancel() {
      finish()
      cancelled.abort()
    },
  })

  return new Response(body, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } })
}
