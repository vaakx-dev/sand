import type { Context } from 'drydock'
import { threadSelect, type WirePairing, wireHello, wireState } from '../contract'
import { after } from '../detached'
import { requestedSession } from '../threads/address'
import type { Store } from '../threads/store'
import { autosave } from './autosave'
import { createKeep } from './keep'
import { readScope, readThread } from './reads'
import { fillThread, restoreScope } from './restore'
import { savedScope, scopeOf, wipeScope } from './scope'
import { createWriter } from './writer'

const restoreWait = 1500

export const createCache = (ctx: Context, store: Store, pairing: () => WirePairing | undefined) => {
  const writer = createWriter(store)
  const kept = createKeep(writer.scope)
  const schedule = autosave(ctx, store, writer)
  let restoredHost: string | undefined
  let settled = false

  const restore = async () => {
    const scope = savedScope(store.here())
    if (!scope) return
    const asked = requestedSession()
    const cached = await readScope(scope.key, asked)
    if (settled) return
    restoreScope(store, cached)
    kept.restore(cached.saved)
    const thread = asked ? store.threads.get(asked) : undefined
    if (thread && cached.asked) fillThread(thread, cached.asked)
    writer.adopt(scope.key, cached.meta)
    if (thread && cached.asked) writer.hydrated(thread, cached.asked)
    restoredHost = scope.host
  }

  const ready = Promise.race([restore().catch(() => {}), new Promise<void>(resolve => after(restoreWait, resolve))]).then(() => {
    settled = true
  })

  const forget = () => {
    const scope = writer.scope()
    writer.use(undefined)
    kept.forget()
    restoredHost = undefined
    for (const id of [...store.threads.keys()]) store.remove(id)
    store.synced.clear()
    if (scope) void wipeScope(scope).catch(() => {})
  }

  const hydrate = async (id: string) => {
    writer.touch(id)
    schedule()
    const scope = writer.scope()
    const thread = store.threads.get(id)
    if (!scope || !writer.usable() || !thread || thread.loaded || thread.cursor || !writer.has(id)) return
    const cached = await readThread(scope, id).catch(() => undefined)
    const now = store.threads.get(id)
    if (!cached || !now || now.loaded || now.cursor || writer.scope() !== scope) return
    fillThread(now, cached)
    writer.hydrated(now, cached)
    store.changed(id, true)
  }

  ctx.on(threadSelect, id => {
    if (id) writer.touch(id)
  })

  ctx.on(wireHello, () => {
    const paired = pairing()
    if (paired) writer.use(scopeOf(paired).key)
    kept.flush()
    schedule()
  })

  ctx.on(wireState, state => {
    if (state === 'unpaired') forget()
  })

  return {
    ready,
    hydrate,
    saved: kept.saved,
    keep: kept.keep,
    async gate(host: string) {
      await ready
      if (restoredHost && restoredHost !== host) forget()
    },
  }
}

export type Cache = ReturnType<typeof createCache>
