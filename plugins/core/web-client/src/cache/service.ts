import { type Pcs, pcsChange, type Wire } from '@sand/devices-contract'
import { onIdle } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { addressedThread, type Thread, threadSelect } from '../contract'
import { after } from '../detached'
import { onPcHello } from '../greeted'
import type { Store } from '../threads/store'
import { autosave } from './autosave'
import { createDevice } from './device'
import { readScope, readThreads } from './reads'
import type { CachedThread, Meta } from './records'
import { fillThread, restoreScope } from './restore'
import { wipeScope } from './scope'
import { createWriter } from './writer'

const restoreWait = 1500

const preloaded = 5

const recentlyOpened = (meta: Meta) =>
  Object.entries(meta.opened)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id)

const unpaired = (pcs: Pcs) => {
  const { phase } = pcs.pairing()
  return phase === 'unpaired' || phase === 'removed'
}

export const createCache = (ctx: Context, store: Store, wire: Wire, pcs: Pcs) => {
  const writer = createWriter(store)
  const schedule = autosave(ctx, store, writer)
  const scope = store.here()
  const device = createDevice(ctx, scope, writer.scope)
  let settled = false
  let forgotten = false

  const restore = async () => {
    const asked = addressedThread()
    const cached = await readScope(scope, asked)
    if (settled) return
    restoreScope(store, cached)
    const thread = asked ? store.threads.get(asked) : undefined
    if (thread && cached.asked) fillThread(thread, cached.asked)
    writer.adopt(scope, cached.meta)
    if (thread && cached.asked) writer.hydrated(thread, cached.asked)
    onIdle(() => preload(recentlyOpened(cached.meta)))
  }

  const ready = Promise.race([restore().catch(() => {}), new Promise<void>(resolve => after(restoreWait, resolve))]).then(() => {
    settled = true
  })

  const forget = () => {
    settled = true
    writer.use(undefined)
    device.forget()
    for (const id of [...store.threads.keys()]) store.remove(id)
    store.synced.clear()
    void wipeScope(scope).catch(() => {})
  }

  const unread = (thread: Thread | undefined): thread is Thread => Boolean(thread && !thread.loaded && !thread.cursor && writer.has(thread.id))

  const fill = (scope: string, id: string, cached: CachedThread | undefined) => {
    const thread = store.threads.get(id)
    if (!cached || !unread(thread) || writer.scope() !== scope) return
    fillThread(thread, cached)
    writer.hydrated(thread, cached)
    store.changed(id, true)
  }

  const read = (ids: string[]) => {
    const current = writer.scope()
    if (!current || !writer.usable() || !ids.length) return undefined
    return readThreads(current, ids).then(
      found => ids.forEach(id => fill(current, id, found.get(id))),
      () => {},
    )
  }

  const preload = (opened: string[]) => void read(opened.filter(id => unread(store.threads.get(id))).slice(0, preloaded))

  const hydrate = (id: string) => {
    writer.touch(id)
    schedule()
    return unread(store.threads.get(id)) ? read([id]) : undefined
  }

  ctx.on(threadSelect, id => {
    if (id) writer.touch(id)
  })

  onPcHello(ctx, wire, pcs, pc => {
    if (pc !== scope) return
    settled = true
    forgotten = false
    writer.use(scope)
    device.resume()
    schedule()
  })

  ctx.on(pcsChange, () => {
    if (!unpaired(pcs) || forgotten) return
    forgotten = true
    forget()
  })

  return {
    ready,
    hydrate,
    device: device.cache,
  }
}

export type Cache = ReturnType<typeof createCache>
