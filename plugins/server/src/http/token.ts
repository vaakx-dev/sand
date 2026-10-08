import type { ServerInfo } from '@sand/protocol'
import { join } from 'node:path'

const file = (home: string) => Bun.file(join(home, 'server.json'))

export const loadToken = async (home: string) => {
  const existing = file(home)
  if (await existing.exists()) {
    const { token } = (await existing.json()) as Partial<ServerInfo>
    if (token) return token
  }
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url')
}

export const writeInfo = (home: string, info: ServerInfo) => Bun.write(file(home), JSON.stringify(info, null, 2))
