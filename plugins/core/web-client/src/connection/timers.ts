type Timer = ReturnType<typeof setInterval>

const heartbeatEvery = 30_000
const reprobeEvery = 60_000

export const createTimers = (beat: () => void, reprobe: () => void) => {
  let heartbeat: Timer | undefined
  let slow: Timer | undefined

  const stopSlow = () => {
    clearInterval(slow)
    slow = undefined
  }

  return {
    update(connected: boolean, slower: boolean) {
      if (!connected) {
        clearInterval(heartbeat)
        heartbeat = undefined
        return stopSlow()
      }
      heartbeat ??= setInterval(beat, heartbeatEvery)
      if (slower) slow ??= setInterval(reprobe, reprobeEvery)
      else stopSlow()
    },
  }
}
