import { closeSync, mkdirSync, openSync } from 'node:fs'
import { join } from 'node:path'
import { running } from './info'

const main = join(import.meta.dir, '..', 'main.ts')

export const start = async (home: string, cwd: string, lan?: boolean) => {
  const log = join(home, 'server.log')
  mkdirSync(home, { recursive: true })
  const output = openSync(log, 'w')
  const child = Bun.spawn([process.execPath, main, 'serve', ...(lan ? ['--lan'] : [])], {
    cwd,
    detached: true,
    stdin: 'ignore',
    stdout: output,
    stderr: output,
  })
  closeSync(output)
  let exited = false
  void child.exited.then(() => (exited = true))
  try {
    for (let tries = 0; tries < 300 && !exited; tries++) {
      const info = await running(home)
      if (info?.pid === child.pid) return info
      await Bun.sleep(100)
    }
  } finally {
    child.unref()
  }
  throw new Error(`sand did not start, see ${log}`)
}
