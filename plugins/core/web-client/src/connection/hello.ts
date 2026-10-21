import type { Hello, HelloValues, hello, InputOf } from '@sand/host-hub/contract'
import { isRecord } from '@sand/util'

const kept = 4

interface SavedHello {
  tag: string
  shared: HelloValues
}

export interface HelloKeep {
  load(): unknown
  save(saved: SavedHello): void
}

const isSaved = (value: unknown): value is SavedHello =>
  isRecord(value) && typeof value.tag === 'string' && value.tag.length > 0 && isRecord(value.shared)

export const helloMemory = (keep?: HelloKeep) => {
  const shared = new Map<string, HelloValues>()
  let last: string | undefined
  let loaded = false

  const load = () => {
    if (loaded || !keep) return
    loaded = true
    const saved = keep.load()
    if (last || !isSaved(saved)) return
    shared.set(saved.tag, saved.shared)
    last = saved.tag
  }

  const remember = (tag: string, values: HelloValues) => {
    shared.delete(tag)
    shared.set(tag, values)
    while (shared.size > kept) shared.delete(shared.keys().next().value!)
    last = tag
    keep?.save({ tag, shared: values })
    return values
  }

  return {
    greeting(since: string | null): InputOf<typeof hello> {
      load()
      return { since, ...(last && { known: last }) }
    },
    take(hello: Hello): HelloValues {
      const values = hello.shared ? remember(hello.tag, hello.shared) : shared.get(hello.tag)
      return { ...values, ...hello.fresh }
    },
  }
}
