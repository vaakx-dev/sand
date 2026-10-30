import { type Pcs, pcsChange, type Wire } from '@sand/devices-contract'
import type { Context } from 'drydock'
import { threadSelect } from '../contract'
import { after } from '../detached'
import { onPcHello } from '../greeted'
import { requestedSession } from '../threads/address'
import type { Store } from '../threads/store'
import { autosave } from './autosave'
import { createKeep } from './keep'
import { readScope, readThread } from './reads'
import { fillThread, restoreScope } from './restore'
import { wipeScope } from './scope'
import { createWriter } from './writer'

const restoreWait = 1500

const unpaired = (pcs: Pcs) => {
  const { phase } = pcs.pairing()
  return phase === 'unpaired' || phase === 'removed'
}

export const createCache = (ctx: Context, store: Store, wire: Wire, pcs: Pcs) => {
  const writer = createWriter(store)
  const kept = createKeep(writer.scope)
  const schedule = autosave(ctx, store, writer)
  const scope = store.here()
  let settled = false
  let forgotten = false

  const restore = async () => {
    const asked = requestedSession()
    const cached = await readScope(scope, asked)
    if (settled) return
    restoreScope(store, cached)
    kept.restore(cached.saved)
    const thread = asked ? store.threads.get(asked) : undefined
    if (thread && cached.asked) fillThread(thread, cached.asked)
    writer.adopt(scope, cached.meta)
    if (thread && cached.asked) writer.hydrated(thread, cached.asked)
  }

  const ready = Promise.race([restore().catch(() => {}), new Promise<void>(resolve => after(restoreWait, resolve))]).then(() => {
    settled = true
  })

  const forget = () => {
    settled = true
    writer.use(undefined)
    kept.forget()
    for (const id of [...store.threads.keys()]) store.remove(id)
    store.synced.clear()
    void wipeScope(scope).catch(() => {})
  }

  const hydrate = async (id: string) => {
    writer.touch(id)
    schedule()
    const current = writer.scope()
    const thread = store.threads.get(id)
    if (!current || !writer.usable() || !thread || thread.loaded || thread.cursor || !writer.has(id)) return
    const cached = await readThread(current, id).catch(() => undefined)
    const now = store.threads.get(id)
    if (!cached || !now || now.loaded || now.cursor || writer.scope() !== current) return
    fillThread(now, cached)
    writer.hydrated(now, cached)
    store.changed(id, true)
  }

  ctx.on(threadSelect, id => {
    if (id) writer.touch(id)
  })

  onPcHello(ctx, wire, pcs, pc => {
    if (pc !== scope) return
    settled = true
    forgotten = false
    writer.use(scope)
    kept.flush()
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
    saved: kept.saved,
    keep: kept.keep,
  }
}

export type Cache = ReturnType<typeof createCache>
