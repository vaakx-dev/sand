const firstCheck = 20_000
const checkEvery = 6 * 60 * 60_000
const cleanupAfter = 60_000

export const scheduleChecks = (check: () => void, cleanup?: () => void) => {
  let interval: ReturnType<typeof setInterval> | undefined
  const timers = [
    setTimeout(() => {
      check()
      interval = setInterval(check, checkEvery)
    }, firstCheck),
  ]
  if (cleanup) timers.push(setTimeout(cleanup, cleanupAfter))
  return () => {
    for (const timer of timers) clearTimeout(timer)
    clearInterval(interval)
  }
}
