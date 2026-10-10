import type { Hello } from '@sand/protocol'
import type { Thread } from '../contract'
import { clearTurn } from './live'
import type { Store } from './store'

const stale = (thread: Thread) => {
  if (thread.info.head && thread.entries.has(thread.info.head)) thread.cursor = thread.info.head
  thread.loaded = false
}

const unlisted = (store: Store, hello: Hello, owned: () => Thread[]) => {
  const known = new Set(hello.sessions.map(info => info.id))
  const main = owned().filter(thread => thread.info.kind !== 'agent')
  for (const thread of main) if (!known.has(thread.id)) store.remove(thread.id)
  for (const thread of owned()) if (!known.has(thread.id) && !store.threads.has(thread.info.parent ?? '')) store.remove(thread.id)
}

export const applyHello = (store: Store, hello: Hello, device?: string) => {
  const owned = () => [...store.threads.values()].filter(thread => thread.device === device)
  for (const thread of owned()) stale(thread)
  if (hello.delta) {
    for (const id of hello.removed ?? []) if (store.threads.get(id)?.device === device) store.remove(id)
  } else unlisted(store, hello, owned)
  for (const info of hello.sessions) store.upsert(info, device)
  const active = new Set(hello.active)
  for (const thread of owned()) {
    thread.running = active.has(thread.id)
    if (!thread.running) clearTurn(thread)
    else thread.started ??= hello.started?.[thread.id]
    store.changed(thread.id)
  }
  if (hello.sync) store.synced.set(device ?? '', hello.sync)
  else store.synced.delete(device ?? '')
}
