import { serverInfoFile } from '@sand/boot'
import { writePrivateJson } from '@sand/util/fs'
import { rmSync } from 'node:fs'
import type { ServerInfo } from './contract'

export const writeServerInfo = (home: string, urls: string[]) => {
  const info: ServerInfo = { url: urls[0]!, urls, pid: process.pid }
  return writePrivateJson(serverInfoFile(home), info)
}

export const removeServerInfo = (home: string) => rmSync(serverInfoFile(home), { force: true })
