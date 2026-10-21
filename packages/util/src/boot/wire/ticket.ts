import type { Ticket } from '@sand/host-devices/contract'
import { trimSlash } from '../../text/url'
import { hostPaths } from './paths'

export const hostTimeout = 10_000

export const bearer = (key: string) => ({ authorization: `Bearer ${key}` })

export const hostEndpoint = (base: string, path: string) => `${trimSlash(base)}${path}`

const failure = async (response: Response) => new Error((await response.text()) || `HTTP ${response.status}`)

export const hostReply = async <T>(response: Response): Promise<T> => {
  if (!response.ok) throw await failure(response)
  return (await response.json()) as T
}

export const requestTicket = async (base: string, key: string): Promise<Ticket | undefined> => {
  const response = await fetch(hostEndpoint(base, hostPaths.ticket), { method: 'POST', headers: bearer(key), signal: AbortSignal.timeout(hostTimeout) })
  if (response.status === 401 || response.status === 403) return
  return hostReply<Ticket>(response)
}
