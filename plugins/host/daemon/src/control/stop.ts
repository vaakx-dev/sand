import type { ServerInfo } from '@sand/host-gateway/contract'
import { daemonStop } from '../contract'
import { ask } from './ask'
import { isAlive } from './info'
import { portHolder } from './owner/holder'
import { servesHome } from './owner/serves-home'

const waitForExit = async (pid: number) => {
  for (let tries = 0; tries < 100 && isAlive(pid); tries++) await Bun.sleep(100)
  return !isAlive(pid)
}

const askToStop = async (home: string, info: ServerInfo) => {
  try {
    await ask(home, info, daemonStop, {}, 3000)
    return true
  } catch {
    return false
  }
}

const signal = (pid: number, name: NodeJS.Signals) => {
  try {
    process.kill(pid, name)
  } catch {}
}

const forceStop = async (home: string, { pid, url }: ServerInfo) => {
  if (!(await servesHome(pid, home))) throw new Error(`process ${pid} on ${url} is not sand serving ${home}, so it was left running`)
  signal(pid, 'SIGINT')
  if (await waitForExit(pid)) return
  signal(pid, 'SIGTERM')
  if (!(await waitForExit(pid))) throw new Error(`sand (pid ${pid}) did not stop`)
}

export const stop = async (home: string) => {
  const info = await portHolder(home)
  if (!info) return
  if (!((await askToStop(home, info)) && (await waitForExit(info.pid)))) await forceStop(home, info)
  return info.pid
}
