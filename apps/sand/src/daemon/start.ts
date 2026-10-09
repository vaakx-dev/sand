import { closeSync, existsSync, mkdirSync, openSync, renameSync, statSync, writeSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { bunBinary, readBuildBun } from '../host/dist/bun/home'
import { appMain, installedRoot } from '../host/dist/layout'
import { running } from './info'

const ownMain = join(import.meta.dir, '..', 'main.ts')
const logLimit = 5 * 1024 * 1024

export const hostCommand = async (home: string): Promise<[bun: string, main: string]> => {
  const root = await installedRoot(home)
  if (!root) return [process.execPath, ownMain]
  const version = await readBuildBun(root)
  if (!version) return [process.execPath, appMain(root)]
  const bun = bunBinary(home, version)
  if (!existsSync(bun)) throw new Error(`sand's Bun ${version} is missing for build ${basename(root).slice(0, 6)}; run Repair from another PC`)
  return [bun, appMain(root)]
}

const openLog = (log: string) => {
  try {
    if (statSync(log).size > logLimit) renameSync(log, `${log}.1`)
  } catch {}
  const output = openSync(log, 'a')
  writeSync(output, `\n--- sand starting ${new Date().toISOString()} ---\n`)
  return output
}

export interface StartOptions {
  wait?: number
  stopOnFail?: boolean
}

export const start = async (home: string, { wait = 30_000, stopOnFail = false }: StartOptions = {}) => {
  const log = join(home, 'server.log')
  mkdirSync(home, { recursive: true })
  const [bun, main] = await hostCommand(home)
  const output = openLog(log)
  const child = Bun.spawn([bun, main, 'serve'], {
    cwd: homedir(),
    detached: true,
    windowsHide: true,
    stdin: 'ignore',
    stdout: output,
    stderr: output,
  })
  closeSync(output)
  let exited = false
  void child.exited.then(() => (exited = true))
  try {
    const until = Date.now() + wait
    while (!exited && Date.now() < until) {
      const info = await running(home)
      if (info?.pid === child.pid) return info
      await Bun.sleep(100)
    }
    if (stopOnFail && !exited) {
      child.kill()
      await Promise.race([child.exited, Bun.sleep(5000)])
      if (!exited) child.kill('SIGKILL')
    }
  } finally {
    child.unref()
  }
  throw new Error(`sand did not start, see ${log}`)
}
