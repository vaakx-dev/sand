import type { HostStatus, ServerInfo } from '@sand/protocol'
import { bearer, hostPaths } from '@sand/kit'
import { join } from 'node:path'

const infoFile = (home: string) => join(home, 'server.json')

export const readInfo = async (home: string): Promise<ServerInfo | undefined> => {
  try {
    const info = (await Bun.file(infoFile(home)).json()) as ServerInfo
    return { ...info, urls: info.urls ?? [info.url] }
  } catch {
    return undefined
  }
}

export const isAlive = (pid: number) => {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const fetchHealth = ({ url, key }: ServerInfo) => fetch(`${url}${hostPaths.health}`, { headers: bearer(key), signal: AbortSignal.timeout(1500) })

const answers = async (info: ServerInfo) => {
  if (!info.key) return false
  try {
    return (await fetchHealth(info)).ok
  } catch {
    return false
  }
}

const status = async (info: ServerInfo): Promise<Pick<HostStatus, 'runtime' | 'error'>> => {
  try {
    const response = await fetchHealth(info)
    if (response.ok) return (await response.json()) as HostStatus
  } catch {}
  return { runtime: 'starting' }
}

export const waitForRuntime = async (info: ServerInfo, home: string, timeout = 60_000) => {
  const log = join(home, 'server.log')
  const deadline = Date.now() + timeout
  while (true) {
    const { runtime, error } = await status(info)
    if (runtime === 'ready') return
    if (runtime === 'failed') throw new Error(`sand started, but its runtime failed: ${error}; see ${log}`)
    if (!isAlive(info.pid)) throw new Error(`sand stopped before its runtime was ready; see ${log}`)
    if (Date.now() >= deadline) throw new Error(`sand started, but its runtime is still not ready; see ${log}`)
    await Bun.sleep(200)
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
