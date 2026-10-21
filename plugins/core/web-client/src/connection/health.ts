import { joinDisposers } from '@sand/util'
import { every } from '../detached'
import type { Connection } from '../integrations/socket'

const beatEvery = 30_000
const reprobeEvery = 60_000
const recent = 10_000
const silentLimit = 20_000
export const beatWait = 15_000
const wakeWait = 10_000
const wakeGap = 3000

interface Watched {
  current(): Connection | undefined
  ask(connection: Connection, wait: number): Promise<unknown>
  lose(connection: Connection): void
  slower(): boolean
  reprobe(): void
}

export const watchHealth = (pc: Watched) => {
  let stopTimers: (() => void) | undefined
  let lastCheck = 0

  const quietFor = (connection: Connection) => Date.now() - connection.heardAt()

  const probe = async (connection: Connection, wait: number) => {
    if (quietFor(connection) < recent) return
    await pc.ask(connection, wait).catch(() => {})
    if (connection === pc.current() && quietFor(connection) >= silentLimit) pc.lose(connection)
  }

  const beat = () => {
    const connection = pc.current()
    if (connection && document.visibilityState === 'visible') void probe(connection, beatWait)
  }

  const reprobeIfSlower = () => {
    if (pc.slower()) pc.reprobe()
  }

  return {
    plan() {
      if (pc.current()) {
        stopTimers ??= joinDisposers(every(beatEvery, beat), every(reprobeEvery, reprobeIfSlower))
        return
      }
      stopTimers?.()
      stopTimers = undefined
    },
    async check() {
      const connection = pc.current()
      if (!connection || Date.now() - lastCheck < wakeGap) return
      lastCheck = Date.now()
      await probe(connection, wakeWait)
      if (connection === pc.current()) reprobeIfSlower()
    },
  }
}
