import { TimedOut } from '../errors/timed-out'

export type Quiet = ReturnType<typeof quietLimit>

const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304])

export const quietLimit = (timeoutMs: number, error: () => TimedOut) => {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = () => clearTimeout(timer)
  const start = () => {
    stop()
    timer = setTimeout(() => controller.abort(error()), timeoutMs)
  }

  return { signal: controller.signal, start, stop }
}

export const watchedBody = (response: Response, quiet: Quiet) => {
  const source = response.body
  if (!source || NULL_BODY_STATUSES.has(response.status)) {
    quiet.stop()
    return response
  }
  const reader = source.getReader()
  const body = new ReadableStream<Uint8Array>({
    async pull(out) {
      quiet.start()
      try {
        const { done, value } = await reader.read()
        if (done) return out.close()
        out.enqueue(value)
      } finally {
        quiet.stop()
      }
    },
    cancel(reason) {
      quiet.stop()
      return reader.cancel(reason)
    },
  })
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
}
