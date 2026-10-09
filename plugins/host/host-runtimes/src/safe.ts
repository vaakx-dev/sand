import { createStrikes } from './strikes'

export const autoSafeText = (error: string) => `sand started in safe mode because your plugins kept crashing it: ${error}`

export const createSafeMode = (initial: boolean, now?: () => number) => {
  const strikes = createStrikes(now)
  let on = initial
  let cause: string | undefined

  const set = (next: boolean) => {
    on = next
    cause = undefined
    strikes.reset()
  }

  const failed = (error: string) => {
    if (on || !strikes.add()) return false
    set(true)
    cause = error
    return true
  }

  const ready = (safe: boolean) => {
    if (!safe) {
      strikes.reset()
      return undefined
    }
    const text = cause && autoSafeText(cause)
    cause = undefined
    return text
  }

  return { on: () => on, set, failed, ready }
}
