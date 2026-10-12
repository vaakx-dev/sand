const longest = 2 ** 31 - 1

export const createTimer = (soonest: () => number, run: () => Promise<void>) => {
  let timer: Timer | undefined
  let stopped = false

  const arm = () => {
    clearTimeout(timer)
    const at = soonest()
    if (stopped || at === Infinity) return
    timer = setTimeout(() => void run().finally(arm), Math.min(Math.max(0, at - Date.now()), longest))
  }

  const stop = () => {
    stopped = true
    clearTimeout(timer)
  }

  return { arm, stop }
}
