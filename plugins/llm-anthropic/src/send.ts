import { ApiError } from './error'

const retryable = (response: Response) => {
  const hint = response.headers.get('x-should-retry')
  if (hint) return hint === 'true'
  return response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500
}

const delay = (attempt: number, headers?: Headers) => {
  const ms = Number(headers?.get('retry-after-ms'))
  if (ms > 0) return ms
  const seconds = Number(headers?.get('retry-after'))
  if (seconds > 0) return seconds * 1000
  return Math.min(500 * 2 ** attempt, 8000) * (0.75 + Math.random() / 2)
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const abort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', abort, { once: true })
  })

export interface SendOptions {
  retries: number
  signal?: AbortSignal
  inspect?(response: Response): void
  limited?(): RequestInit | undefined
}

export const send = async (url: string, init: RequestInit, { retries, signal, inspect, limited }: SendOptions) => {
  for (let attempt = 0; ; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { ...init, signal })
    } catch (error) {
      if (signal?.aborted || attempt >= retries) throw error
      await sleep(delay(attempt), signal)
      continue
    }
    inspect?.(response)
    if (response.ok) return response
    const fallback = response.status === 429 ? limited?.() : undefined
    if (fallback) {
      await response.body?.cancel()
      init = fallback
      limited = undefined
      attempt--
      continue
    }
    if (!retryable(response) || attempt >= retries) throw await ApiError.from(response)
    await response.body?.cancel()
    await sleep(delay(attempt, response.headers), signal)
  }
}
