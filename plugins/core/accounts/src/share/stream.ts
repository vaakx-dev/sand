import { type LLMEvent, ThreadLost } from '../contract'
import { errorMessage } from '@sand/util'
import { detailOf } from '../errors'
import type { ShareLine } from './info'

const heartbeat = 5_000

const errorLine = (error: unknown): ShareLine => {
  const detail = detailOf(error)
  return { type: 'error', message: errorMessage(error), ...(detail && { detail }), ...(error instanceof ThreadLost && { lost: true }) }
}

export const streamLines = (events: (signal: AbortSignal) => AsyncIterable<LLMEvent>, signal: AbortSignal) => {
  const cancelled = new AbortController()
  const upstream = AbortSignal.any([signal, cancelled.signal])
  const encoder = new TextEncoder()
  let beat: ReturnType<typeof setInterval> | undefined

  const stop = () => {
    cancelled.abort()
    clearInterval(beat)
  }

  const body = new ReadableStream<Uint8Array>({
    async start(out) {
      const line = (value: ShareLine) => {
        if (upstream.aborted) return
        try {
          out.enqueue(encoder.encode(`${JSON.stringify(value)}\n`))
        } catch {
          stop()
        }
      }
      beat = setInterval(() => line({ type: 'ping' }), heartbeat)
      try {
        for await (const event of events(upstream)) {
          if (upstream.aborted) break
          line(event)
        }
      } catch (error) {
        line(errorLine(error))
      }
      clearInterval(beat)
      if (!upstream.aborted) out.close()
    },
    cancel: stop,
  })

  return new Response(body, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } })
}
