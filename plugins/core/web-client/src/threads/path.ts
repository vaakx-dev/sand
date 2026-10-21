import { hasToolResult } from '@sand/chats/prompt'
import type { Entry, Message } from '@sand/chats/contract'
import type { Thread } from '../contract'

const walk = (entries: Map<string, Entry>, head: string | null) => {
  const path: Entry[] = []
  const seen = new Set<string>()
  for (let entry = head ? entries.get(head) : undefined; entry && !seen.has(entry.id); entry = entries.get(entry.parent ?? '')) {
    seen.add(entry.id)
    path.push(entry)
  }
  return path.reverse()
}

const isPrompt = (message: Message) => message.role === 'user' && !hasToolResult(message)

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

export const turnStart = (thread: Thread) =>
  loadedPath(thread)
    .filter(entry => entry.type === 'message' && isPrompt(entry.data as Message))
    .at(-1)?.at

export const merge = (thread: Thread, entries: Entry[]) => {
  for (const entry of entries) thread.entries.set(entry.id, entry)
}
