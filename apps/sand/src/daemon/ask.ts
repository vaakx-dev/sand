import type { ServerInfo, WireRequest } from '@sand/protocol'
import { requestTicket } from '@sand/kit'
import { askHost, SocketError } from '@sand/kit/host'

const cliMessages = { timeout: 'sand did not answer', closed: 'sand did not answer', failed: 'could not reach sand' }

export const ask = async <T>({ url, key }: Pick<ServerInfo, 'url' | 'key'>, request: WireRequest, timeout?: number) => {
  const ticket = await requestTicket(url, key)
  if (!ticket) throw new Error('sand refused this key')
  try {
    return (await askHost(url, ticket.ticket, request, timeout)) as T
  } catch (error) {
    throw error instanceof SocketError ? new Error(cliMessages[error.kind]) : error
  }
}
