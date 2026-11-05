import type { ServerInfo } from '@sand/host-gateway/contract'
import { join } from 'node:path'

export const serverInfoFile = (home: string) => join(home, 'server.json')

export const readServerInfo = async (home: string): Promise<ServerInfo | undefined> => {
  try {
    return (await Bun.file(serverInfoFile(home)).json()) as ServerInfo
  } catch {
    return undefined
  }
}
