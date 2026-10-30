import { sessionHeader, type TransportInit } from '@sand/devices-contract'

const headersOf = (init: RequestInit | undefined, session: string) => {
  const headers: Record<string, string> = {}
  new Headers(init?.headers).forEach((value, key) => {
    headers[key] = value
  })
  headers.authorization = sessionHeader(session)
  return headers
}

export const authedInit = (init: RequestInit | undefined, session: string, timeout: number): TransportInit => ({
  method: (init?.method ?? 'GET').toUpperCase(),
  headers: headersOf(init, session),
  timeout,
  ...(init?.body != null && { body: init.body }),
  ...(init?.signal && { signal: init.signal }),
})
