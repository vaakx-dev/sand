import { closeSync, openSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { OrrinPong } from '../contract'
import { callDaemon } from '../daemon/call'
import { findDaemon } from '../daemon/find'

export interface LiveDaemon extends OrrinPong {
  port: number
  projects: number
}

const pingTimeout = 2_000
const startWait = 20_000
const stopWait = 15_000

export const liveDaemon = async (home: string): Promise<LiveDaemon | undefined> => {
  const daemon = await findDaemon(home)
  if (!daemon) return undefined
  const signal = AbortSignal.timeout(pingTimeout)
  const pong = await callDaemon(daemon, 'ping', {}, signal).catch(() => undefined)
  if (!pong) return undefined
  const { projects } = await callDaemon(daemon, 'projects.list', {}, signal)
  return { ...pong, port: Number(new URL(daemon.url).port), projects: projects.length }
}

const waitFor = async (check: () => Promise<boolean>, timeout: number) => {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    if (await check()) return true
    await Bun.sleep(200)
  }
  return false
}

const serveCommand = (binary: string, home: string, port?: number) => [
  binary,
  '--home',
  home,
  'serve',
  ...(port === undefined ? [] : ['--port', String(port)]),
]

const startFailure = async (home: string, pid: number, log: string) => {
  const live = await liveDaemon(home)
  if (live && live.pid !== pid) return new Error(`another Orrin already answers on port ${live.port}; set [plugins.orrin] port to use a different one`)
  return new Error(`Orrin did not start; see ${log}`)
}

export const startDaemon = async (home: string, binary: string, port?: number) => {
  const log = join(home, 'serve.log')
  await mkdir(home, { recursive: true })
  const output = openSync(log, 'a')
  const child = Bun.spawn(serveCommand(binary, home, port), {
    cwd: home,
    detached: true,
    windowsHide: true,
    stdin: 'ignore',
    stdout: output,
    stderr: output,
  })
  closeSync(output)
  child.unref()
  let exited = false
  void child.exited.then(() => (exited = true))
  const started = await waitFor(async () => exited || (await liveDaemon(home))?.pid === child.pid, startWait)
  if (started && !exited) return
  if (!exited) child.kill()
  throw await startFailure(home, child.pid, log)
}

export const stopDaemon = async (home: string, pid: number) => {
  process.kill(pid, process.platform === 'win32' ? 'SIGTERM' : 'SIGINT')
  const stopped = await waitFor(async () => (await liveDaemon(home)) === undefined, stopWait)
  if (!stopped) throw new Error('Orrin did not stop')
}
