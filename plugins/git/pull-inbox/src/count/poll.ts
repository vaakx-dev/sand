const everyMs = 2 * 60_000

export const createPoll = (tick: () => void) => {
  let timer: Timer | undefined

  return {
    set(active: boolean) {
      if (active) timer ??= setInterval(tick, everyMs)
      else {
        clearInterval(timer)
        timer = undefined
      }
    },
  }
}
