import type { ServerInfo, WireRequest } from '@sand/protocol'
import { requestTicket } from '@sand/kit'
import { askHost } from '@sand/kit/host'

export const ask = async <T>({ url, key }: Pick<ServerInfo, 'url' | 'key'>, request: WireRequest, timeout?: number) => {
  const ticket = await requestTicket(url, key)
  if (!ticket) throw new Error('sand refused this key')
  return (await askHost(url, ticket.ticket, request, timeout)) as T
}
