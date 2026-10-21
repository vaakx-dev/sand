import type { ServerInfo } from '@sand/host-gateway/contract'
import { join } from 'node:path'
import { ticketSocketUrl } from './wire/paths'
import { requestTicket } from './wire/ticket'

export const serverInfoFile = (home: string) => join(home, 'server.json')

export const readServerInfo = async (home: string): Promise<ServerInfo | undefined> => {
  try {
    return (await Bun.file(serverInfoFile(home)).json()) as ServerInfo
  } catch {
    return undefined
  }
}

export const adminSocketUrl = async ({ url, key }: Pick<ServerInfo, 'url' | 'key'>) => {
  const ticket = await requestTicket(url, key)
  if (!ticket) throw new Error('sand refused this key')
  return ticketSocketUrl(url, ticket.ticket)
}
