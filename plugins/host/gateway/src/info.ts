import { serverInfoFile } from '@sand/util/boot'
import { writePrivateJson } from '@sand/util/fs'
import type { ServerInfo } from './contract'

export const writeServerInfo = (home: string, urls: string[], key: string) => {
  const info: ServerInfo = { url: urls[0]!, urls, pid: process.pid, key }
  return writePrivateJson(serverInfoFile(home), info)
}
