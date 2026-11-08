import { unanswered } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'

export const feed = <T>(load: () => Promise<T>, initial: T) => {
  const value = sig<T>(initial)
  const error = sig<string | undefined>(undefined)
  const loaded = sig(false)
  const missing = sig(false)
  let asked = 0

  const refresh = () => {
    const ask = ++asked
    return load().then(
      next => {
        if (ask !== asked) return
        value.set(next)
        error.set(undefined)
        missing.set(false)
        loaded.set(true)
      },
      (failure: unknown) => {
        if (ask !== asked) return
        missing.set(unanswered(failure))
        error.set(missing.get() ? undefined : errorMessage(failure))
      },
    )
  }

  return { value, error, loaded, missing, refresh }
}

export type Feed<T> = ReturnType<typeof feed<T>>
