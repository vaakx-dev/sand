import type { Entry } from '@sand/messages'
import type { Thread } from '../contract'
import { walk } from './store'

export const loadedPath = (thread: Thread) => walk(thread.entries, thread.info.head)

export const hasOlder = (thread: Thread, path = loadedPath(thread)) => {
  const oldest = path[0]
  return Boolean(!thread.complete && oldest?.parent && oldest.id !== thread.floor && !thread.entries.has(oldest.parent))
}

export const pathOf = (thread: Thread, carried = false): Entry[] => {
  const path = loadedPath(thread)
  if (!carried || !thread.carried?.length || !hasOlder(thread, path)) return path
  return [...thread.carried.filter(entry => !thread.entries.has(entry.id)), ...path]
}

export const merge = (thread: Thread, entries: Entry[]) => {
  for (const entry of entries) thread.entries.set(entry.id, entry)
}
