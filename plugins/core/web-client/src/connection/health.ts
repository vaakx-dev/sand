import { every } from '../detached'
import type { Connection } from '../integrations/socket'
import { TimedOut } from './timeout'

const beatEvery = 30_000
const reprobeEvery = 60_000
export const beatWait = 8000
const wakeWait = 4000
const wakeGap = 3000

interface Watched {
  current(): Connection | undefined
  ask(connection: Connection, wait: number): Promise<unknown>
  lose(connection: Connection): void
  slower(): boolean
  reprobe(): void
}

export const watchHealth = (pc: Watched) => {
  let stopBeat: (() => void) | undefined
  let stopReprobe: (() => void) | undefined
  let lastCheck = 0

  const answers = async (connection: Connection, wait: number) => {
    try {
      await pc.ask(connection, wait)
      return connection === pc.current()
    } catch (failure) {
      if (failure instanceof TimedOut) pc.lose(connection)
      return false
    }
  }

  const beat = () => {
    const connection = pc.current()
    if (connection && document.visibilityState === 'visible') void answers(connection, beatWait)
  }

  const stopReprobing = () => {
    stopReprobe?.()
    stopReprobe = undefined
  }

  return {
    plan() {
      if (!pc.current()) {
        stopBeat?.()
        stopBeat = undefined
        return stopReprobing()
      }
      stopBeat ??= every(beatEvery, beat)
      if (pc.slower()) stopReprobe ??= every(reprobeEvery, pc.reprobe)
      else stopReprobing()
    },
    async check() {
      const connection = pc.current()
      if (!connection || Date.now() - lastCheck < wakeGap) return
      lastCheck = Date.now()
      if ((await answers(connection, wakeWait)) && pc.slower()) pc.reprobe()
    },
  }
}
