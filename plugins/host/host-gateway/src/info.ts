import { writePrivateJson } from '@sand/kit/fs'
import { serverInfoFile } from '@sand/kit/host'
import type { ServerInfo } from '@sand/protocol'

export const writeServerInfo = (home: string, urls: string[], key: string) => {
  const info: ServerInfo = { url: urls[0]!, urls, pid: process.pid, key }
  return writePrivateJson(serverInfoFile(home), info)
}
