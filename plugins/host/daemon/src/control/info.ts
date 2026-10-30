import type { ServerInfo } from '@sand/host-gateway/contract'
import { hostHealthRequest, type HostHealth } from '@sand/host-health/contract'
import { readServerInfo } from '@sand/util/boot'
import { join } from 'node:path'
import { ask } from './ask'
import { ownIdentity } from './link/identity'
import { pcKeys } from './link/keys'

const statusTimeout = 5000

export const isAlive = (pid: number) => {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const answers = async (home: string, info: ServerInfo) => {
  try {
    await ownIdentity(info.url, await pcKeys(home))
    return true
  } catch {
    return false
  }
}

const status = async (home: string, info: ServerInfo): Promise<Pick<HostHealth, 'runtime' | 'error'>> => {
  try {
    return await ask(home, info, hostHealthRequest, {}, statusTimeout)
  } catch {
    return { runtime: 'starting' }
  }
}

export const waitForRuntime = async (info: ServerInfo, home: string, timeout = 60_000) => {
  const log = join(home, 'server.log')
  const deadline = Date.now() + timeout
  while (true) {
    const { runtime, error } = await status(home, info)
    if (runtime === 'ready') return
    if (runtime === 'failed') throw new Error(`sand started, but its runtime failed: ${error}; see ${log}`)
    if (!isAlive(info.pid)) throw new Error(`sand stopped before its runtime was ready; see ${log}`)
    if (Date.now() >= deadline) throw new Error(`sand started, but its runtime is still not ready; see ${log}`)
    await Bun.sleep(200)
  }
}

export const running = async (home: string) => {
  const info = await readServerInfo(home)
  return info && isAlive(info.pid) && (await answers(home, info)) ? info : undefined
}

export const requireRunning = async (home: string, hint = 'start it with `sand` first') => {
  const info = await running(home)
  if (!info) throw new Error(`sand is not running; ${hint}`)
  return info
}
