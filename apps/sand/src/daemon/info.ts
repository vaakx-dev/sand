import type { ServerInfo } from '@sand/protocol'
import { join } from 'node:path'

const infoFile = (home: string) => join(home, 'server.json')

const readInfo = async (home: string) => {
  try {
    const info = (await Bun.file(infoFile(home)).json()) as ServerInfo
    return { ...info, urls: info.urls ?? [info.url] }
  } catch {
    return undefined
  }
}

export const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const answers = async ({ url, token }: ServerInfo) => {
  try {
    const response = await fetch(`${url}/build?token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(1500) })
    return response.status !== 401
  } catch {
    return false
  }
}

export const running = async (home: string) => {
  const info = await readInfo(home)
  return info && isAlive(info.pid) && (await answers(info)) ? info : undefined
}

export const requireRunning = async (home: string, hint = 'start it with `sand` first') => {
  const info = await running(home)
  if (!info) throw new Error(`sand is not running; ${hint}`)
  return info
}
