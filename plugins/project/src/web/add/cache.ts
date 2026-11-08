import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'

export type Loaded<T> = { state: 'loading' } | { state: 'done'; value: T } | { state: 'failed'; error: string }

export const cache = <T>(load: (key: string) => Promise<T>) => {
  const entries = new Map<string, Loaded<T>>()
  const version = sig(0)
  const settle = (key: string, entry: Loaded<T>) => {
    entries.set(key, entry)
    version.update(value => value + 1)
  }
  return (key: string): Loaded<T> => {
    version.get()
    const known = entries.get(key)
    if (known) return known
    const loading: Loaded<T> = { state: 'loading' }
    entries.set(key, loading)
    load(key).then(
      value => settle(key, { state: 'done', value }),
      (error: unknown) => settle(key, { state: 'failed', error: errorMessage(error) }),
    )
    return loading
  }
}
