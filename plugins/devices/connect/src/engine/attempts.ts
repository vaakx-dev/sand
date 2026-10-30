import type { Attempt } from '@sand/devices-contract'

const kept = 50

const repeats = (a: Attempt, b: Attempt) => a.route.key === b.route.key && a.result === b.result && a.error === b.error

export const attemptLog = () => {
  let attempts: Attempt[] = []
  return {
    add(attempt: Attempt) {
      attempts = [...attempts.filter(known => !repeats(known, attempt)), attempt].slice(-kept)
    },
    list: (): Attempt[] => attempts,
  }
}
