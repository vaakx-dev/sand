import type { StashOrigin, StashRequest, Stashed } from './contract'
import { isRecord, joinDisposers, promptLabel } from '@sand/kit'
import type { Server } from '@sand/server/contract'
import { safeId, type Store } from './store'

const originOf = (from: unknown): StashOrigin | undefined => {
  if (!isRecord(from) || typeof from.cwd !== 'string') return undefined
  const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)
  const [device, thread, title] = [text(from.device), text(from.thread), text(from.title)]
  return { cwd: from.cwd, ...(device && { device }), ...(thread && { thread }), ...(title && { title }) }
}

const stashedOf = ({ text, content, from, item: id, at }: StashRequest): Stashed => {
  if (typeof text !== 'string' || !Array.isArray(content)) throw new Error('A stash needs text and attachments')
  if (!text.trim() && !content.length) throw new Error('There is nothing to stash')
  const origin = originOf(from)
  return {
    id: typeof id === 'string' && safeId.test(id) ? id : Bun.randomUUIDv7(),
    label: promptLabel(text.trim() ? text : content),
    text,
    content,
    ...(origin && { from: origin }),
    at: typeof at === 'number' ? at : Date.now(),
  }
}

export const serveStash = (server: Server, store: Store) => {
  const changed = () => server.broadcast('stash.change', [])
  return joinDisposers(
    server.inlineMedia('stash.list'),
    server.handle({
      'stash.list': () => store.list(),
      'stash.save': async request => {
        const item = stashedOf(request)
        await store.save(item)
        changed()
        return item
      },
      'stash.remove': async ({ item }) => {
        const removed = await store.remove(String(item))
        if (removed) changed()
        return removed
      },
    }),
  )
}
