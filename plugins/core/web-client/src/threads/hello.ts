import { helloActive } from '@sand/host-hub/contract'
import { helloDelta, helloSessions, helloStarted, helloSync } from '@sand/server/contract'
import type { Thread } from '../contract'
import type { HelloRead } from '../wire/hellos'
import { clearTurn } from './live'
import type { Store } from './store'

const stale = (thread: Thread) => {
  if (thread.info.head && thread.entries.has(thread.info.head)) thread.cursor = thread.info.head
  thread.loaded = false
}

export const applyHello = (store: Store, read: HelloRead, device: string) => {
  const sessions = read(helloSessions) ?? []
  const owned = () => [...store.threads.values()].filter(thread => thread.device === device)
  for (const thread of owned()) stale(thread)
  if (!read(helloDelta)) {
    const known = new Set(sessions.map(info => info.id))
    for (const thread of owned()) if (!known.has(thread.id)) store.remove(thread.id)
  }
  for (const info of sessions) store.upsert(info, device)
  const active = new Set(read(helloActive))
  const started = read(helloStarted)
  for (const thread of owned()) {
    thread.running = active.has(thread.id)
    if (!thread.running) clearTurn(thread)
    else thread.started ??= started?.[thread.id]
    store.changed(thread.id)
  }
  const sync = read(helloSync)
  if (sync) store.synced.set(device, sync)
  else store.synced.delete(device)
}
