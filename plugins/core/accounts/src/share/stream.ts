import { type LLMEvent, ProviderTrouble, ThreadLost } from '../contract'
import { errorMessage } from '@sand/util'
import { detailOf } from '../errors'
import type { ShareFailure, ShareLine } from './info'

const heartbeat = 5_000

const kindOf = (error: unknown): ShareFailure | undefined => {
  if (error instanceof ThreadLost) return 'lost'
  if (error instanceof ProviderTrouble) return 'trouble'
  return undefined
}

const errorLine = (error: unknown): ShareLine => {
  const detail = detailOf(error)
  const kind = kindOf(error)
  return { type: 'error', message: errorMessage(error), ...(detail && { detail }), ...(kind && { kind }) }
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
