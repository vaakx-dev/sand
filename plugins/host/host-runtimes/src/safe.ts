const strikeLimit = 3
const strikeWindow = 10 * 60_000

const autoSafeText = (error: string) => `sand started in safe mode because your plugins kept crashing it: ${error}`

export const createSafeMode = (initial: boolean) => {
  let on = initial
  let cause: string | undefined
  let strikes: number[] = []

  const set = (next: boolean) => {
    on = next
    cause = undefined
    strikes = []
  }

  const struckOut = () => {
    const now = Date.now()
    strikes = [...strikes.filter(time => now - time < strikeWindow), now]
    return strikes.length >= strikeLimit
  }

  const failed = (error: string) => {
    if (on || !struckOut()) return false
    set(true)
    cause = error
    return true
  }

  const ready = (safe: boolean) => {
    if (!safe) {
      strikes = []
      return undefined
    }
    const text = cause && autoSafeText(cause)
    cause = undefined
    return text
  }

  return { on: () => on, set, failed, ready }
}
