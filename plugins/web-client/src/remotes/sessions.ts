import type { Hello } from '@sand/protocol'
import type { Store } from '../threads/store'

export const greetRemote = (store: Store, device: string, hello: Hello) => {
  const known = new Set(hello.sessions.map(info => info.id))
  for (const thread of [...store.threads.values()]) if (thread.device === device && !known.has(thread.id)) store.remove(thread.id)
  for (const info of hello.sessions) {
    const thread = store.upsert(info, device)
    thread.running = hello.active.includes(info.id)
    if (!thread.running) thread.started = undefined
    thread.loaded = false
  }
}

export const dropRemote = (store: Store, device: string) => {
  for (const thread of [...store.threads.values()]) if (thread.device === device) store.remove(thread.id)
}
