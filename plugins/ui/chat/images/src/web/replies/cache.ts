import { sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { releaseImage, type DecodedImage } from './integrations/object-url'

export type Outcome = DecodedImage | { error: string }

export interface CachedImage {
  state: Sig<Outcome | undefined>
  start(): void
  reload(): void
}

interface Entry {
  state: Sig<Outcome | undefined>
  fetch: () => Promise<Outcome>
  started: boolean
}

const kept = 100

const release = (outcome: Outcome | undefined) => {
  if (outcome && 'src' in outcome) releaseImage(outcome.src)
}

export const imageCache = () => {
  const entries = new Map<string, Entry>()

  const evict = () => {
    for (const [key, entry] of entries) {
      if (entries.size <= kept) return
      entries.delete(key)
      release(untrack(() => entry.state.get()))
    }
  }

  const touch = (key: string, entry: Entry) => {
    entries.delete(key)
    entries.set(key, entry)
    evict()
  }

  const load = (key: string, entry: Entry) => {
    touch(key, entry)
    entry.started = true
    release(untrack(() => entry.state.get()))
    entry.state.set(undefined)
    void entry.fetch().then(outcome => {
      if (entries.get(key) === entry) entry.state.set(outcome)
      else release(outcome)
    })
  }

  const entryOf = (key: string, fetch: () => Promise<Outcome>) => {
    const entry = entries.get(key) ?? { state: sig<Outcome | undefined>(undefined), fetch, started: false }
    touch(key, entry)
    return entry
  }

  return {
    get(key: string, fetch: () => Promise<Outcome>): CachedImage {
      const entry = entryOf(key, fetch)
      return {
        state: entry.state,
        start() {
          if (!entry.started) load(key, entry)
        },
        reload: () => load(key, entry),
      }
    },
    clear() {
      for (const entry of entries.values()) release(untrack(() => entry.state.get()))
      entries.clear()
    },
  }
}
