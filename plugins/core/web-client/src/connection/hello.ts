import type { Hello } from '@sand/protocol'
import { helloParts } from '@sand/kit'

const kept = 4

export interface SavedHello {
  tag: string
  shared: Partial<Hello>
}

export interface HelloKeep {
  load(): unknown
  save(saved: SavedHello): void
}

const usable = (value: unknown): value is SavedHello => {
  if (!value || typeof value !== 'object') return false
  const { tag, shared } = value as Partial<SavedHello>
  return typeof tag === 'string' && tag.length > 0 && Boolean(shared) && typeof shared === 'object' && !Array.isArray(shared)
}

export const helloMemory = (keep?: HelloKeep) => {
  const shared = new Map<string, Partial<Hello>>()
  let last: string | undefined
  let loaded = false

  const load = () => {
    if (loaded || !keep) return
    loaded = true
    const saved = keep.load()
    if (last || !usable(saved)) return
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
    known() {
      load()
      return last
    },
    take(hello: Hello): Hello {
      if (!hello.same) return remember(hello)
      const { same, ...rest } = hello
      const before = hello.tag ? shared.get(hello.tag) : undefined
      return before ? ({ ...before, ...rest } as Hello) : rest
    },
  }
}
