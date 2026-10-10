import type { Hello, WireRequestOf } from '@sand/protocol'
import { helloParts, isRecord } from '@sand/kit'

const kept = 4

interface SavedHello {
  tag: string
  shared: Partial<Hello>
}

export interface HelloKeep {
  load(): unknown
  save(saved: SavedHello): void
}

const isSaved = (value: unknown): value is SavedHello =>
  isRecord(value) && typeof value.tag === 'string' && value.tag.length > 0 && isRecord(value.shared)

export const helloMemory = (keep?: HelloKeep) => {
  const shared = new Map<string, Partial<Hello>>()
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

  const remember = (hello: Hello) => {
    if (!hello.tag) return hello
    const parts = helloParts(hello).shared
    shared.delete(hello.tag)
    shared.set(hello.tag, parts)
    while (shared.size > kept) shared.delete(shared.keys().next().value!)
    last = hello.tag
    keep?.save({ tag: hello.tag, shared: parts })
    return hello
  }

  return {
    greeting(since: string | null): WireRequestOf<'hello'> {
      load()
      return { type: 'hello', since, ...(last && { known: last }) }
    },
    take(hello: Hello): Hello {
      if (!hello.same) return remember(hello)
      const { same, ...rest } = hello
      const before = hello.tag ? shared.get(hello.tag) : undefined
      return before ? { ...before, ...rest } : rest
    },
  }
}
