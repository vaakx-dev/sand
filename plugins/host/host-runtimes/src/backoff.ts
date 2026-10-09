const first = 1_000
const longest = 30_000
const stable = 60_000

export const backoffDelay = (failures: number) => Math.min(first * 2 ** failures, longest)

export const createBackoff = (restart: () => void) => {
  let failures = 0
  let timer: Timer | undefined
  let calm: Timer | undefined

  const schedule = () => {
    if (timer) return
    const delay = backoffDelay(failures++)
    timer = setTimeout(() => {
      timer = undefined
      restart()
    }, delay)
    return delay
  }

  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
  }

  const healthy = () => {
    clearTimeout(calm)
    calm = setTimeout(() => {
      failures = 0
    }, stable)
  }

  const unhealthy = () => clearTimeout(calm)

  const clear = () => {
    cancel()
    unhealthy()
  }

  return { schedule, cancel, healthy, unhealthy, clear }
}
