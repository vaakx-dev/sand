import { readServerInfo } from '@sand/boot'
import { errorMessage } from '@sand/util'
import { isAlive, running } from '../control/info'
import { start } from '../control/start'

const pollInterval = 2000
const retryDelay = 10_000

const exited = async (pid: number) => {
  while (isAlive(pid)) await Bun.sleep(pollInterval)
}

export const keep = async (home: string, installed: () => Promise<boolean>) => {
  while (await installed()) {
    try {
      const info = (await running(home)) ?? (await start(home))
      await exited(info.pid)
      if (!(await readServerInfo(home))) return
    } catch (error) {
      console.error(errorMessage(error))
      await Bun.sleep(retryDelay)
    }
  }
}
