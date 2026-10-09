import type { ServerInfo } from '@sand/protocol'
import { bearer, hostPaths } from '@sand/kit'
import { isAlive, readInfo } from './info'

const askToStop = async (info: ServerInfo) => {
  try {
    await fetch(`${info.url}${hostPaths.stop}`, { method: 'POST', headers: bearer(info.key), signal: AbortSignal.timeout(3000) })
  } catch {}
}

const stopWindows = async (info: ServerInfo) => {
  await askToStop(info)
  for (let tries = 0; tries < 100 && isAlive(info.pid); tries++) await Bun.sleep(100)
  if (!isAlive(info.pid)) return
  try {
    process.kill(info.pid)
  } catch {}
}

const stopPosix = async (info: ServerInfo) => {
  process.kill(info.pid, 'SIGINT')
  for (let tries = 0; tries < 100 && isAlive(info.pid); tries++) await Bun.sleep(100)
  if (isAlive(info.pid)) process.kill(info.pid, 'SIGTERM')
}

export const stop = async (home: string) => {
  const info = await readInfo(home)
  if (!info || !isAlive(info.pid)) return console.log('sand is not running')
  await (process.platform === 'win32' ? stopWindows(info) : stopPosix(info))
  console.log(`stopped sand (pid ${info.pid})`)
}
