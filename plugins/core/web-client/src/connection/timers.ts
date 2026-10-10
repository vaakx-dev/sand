import { every } from '../detached'

const heartbeatEvery = 30_000
const reprobeEvery = 60_000

export const createTimers = (beat: () => void, reprobe: () => void) => {
  let stopHeartbeat: (() => void) | undefined
  let stopReprobe: (() => void) | undefined

  const stopSlow = () => {
    stopReprobe?.()
    stopReprobe = undefined
  }

  return {
    update(connected: boolean, slower: boolean) {
      if (!connected) {
        stopHeartbeat?.()
        stopHeartbeat = undefined
        return stopSlow()
      }
      stopHeartbeat ??= every(heartbeatEvery, beat)
      if (slower) stopReprobe ??= every(reprobeEvery, reprobe)
      else stopSlow()
    },
  }
}
