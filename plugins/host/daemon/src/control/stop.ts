import type { ServerInfo } from '@sand/host-gateway/contract'
import { bearer, hostPaths, readServerInfo } from '@sand/util/boot'
import { isAlive } from './info'

const waitForExit = async (pid: number) => {
  for (let tries = 0; tries < 100 && isAlive(pid); tries++) await Bun.sleep(100)
  return !isAlive(pid)
}

const askToStop = async (info: ServerInfo) => {
  try {
    await fetch(`${info.url}${hostPaths.stop}`, { method: 'POST', headers: bearer(info.key), signal: AbortSignal.timeout(3000) })
  } catch {}
}

const stopWindows = async (info: ServerInfo) => {
  await askToStop(info)
  if (await waitForExit(info.pid)) return
  try {
    process.kill(info.pid)
  } catch {}
}

const stopPosix = async (info: ServerInfo) => {
  process.kill(info.pid, 'SIGINT')
  if (!(await waitForExit(info.pid))) process.kill(info.pid, 'SIGTERM')
}

export const stop = async (home: string) => {
  const info = await readServerInfo(home)
  if (!info || !isAlive(info.pid)) return console.log('sand is not running')
  await (process.platform === 'win32' ? stopWindows(info) : stopPosix(info))
  console.log(`stopped sand (pid ${info.pid})`)
}
