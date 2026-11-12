import { ApiError } from './error'

interface SendOptions {
  signal?: AbortSignal
  inspect?(response: Response): void
  limited?(): RequestInit | undefined
}

export const send = async (url: string, init: RequestInit, { signal, inspect, limited }: SendOptions): Promise<Response> => {
  const response = await fetch(url, { ...init, signal })
  inspect?.(response)
  if (response.ok) return response
  const fallback = response.status === 429 ? limited?.() : undefined
  if (!fallback) throw await ApiError.from(response)
  await response.body?.cancel()
  return send(url, fallback, { signal, inspect })
}
