import type { ServerInfo } from '@sand/protocol'
import { join } from 'node:path'
import { writePrivateJson } from '../private'

export const writeServerInfo = (home: string, urls: string[], key: string) => {
  const info: ServerInfo = { url: urls[0]!, urls, pid: process.pid, key }
  return writePrivateJson(join(home, 'server.json'), info)
}
