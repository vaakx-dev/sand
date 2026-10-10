import type { WirePairing } from '../contract'
import type { Context } from 'drydock'
import { requestedSession } from '../threads/address'
import type { Store } from '../threads/store'
import { createKeep } from './keep'
import { trimMemory } from './memory'
import { otherScopes, readScope, readThread, wipeScope } from './reads'
import { fillThread, restoreScope } from './restore'
import { savedScope, scopeOf } from './scope'
import { askPersistence, onIdle } from './timing'
import { createWriter } from './writer'

const restoreWait = 1500
const writeDelay = 1000

export const createCache = (ctx: Context, store: Store, pairing: () => WirePairing | undefined) => {
  const writer = createWriter(store)
  const kept = createKeep(writer.scope)
  let restoredHost: string | undefined
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let writing = false
  let tidied = false

  const tidy = (scope: string) => {
    if (tidied) return
    tidied = true
    askPersistence()
    void otherScopes(scope).then(keys => Promise.all(keys.map(wipeScope)), () => {})
  }

  const write = async () => {
    timer = undefined
    if (writing) return schedule()
    writing = true
    const scope = writer.scope()
    const wrote = await writer.flush()
    writing = false
    if (wrote && scope) tidy(scope)
    if (wrote || !writer.usable()) trimMemory(store, writer.opened)
    if (writer.busy()) schedule()
  }

  const schedule = () => {
    if (timer || !writer.scope()) return
    timer = setTimeout(() => onIdle(() => void write()), writeDelay)
  }

  const restore = async () => {
    const scope = savedScope()
    if (!scope) return
    const cached = await readScope(scope.key, requestedSession())
    if (settled) return
    restoreScope(store, cached)
    kept.restore(cached.saved)
    const asked = requestedSession()
    const thread = asked ? store.threads.get(asked) : undefined
    if (thread && cached.asked) fillThread(thread, cached.asked)
    writer.adopt(scope.key, cached.meta)
    if (thread && cached.asked) writer.hydrated(thread, cached.asked)
    restoredHost = scope.host
  }

  const ready = Promise.race([restore().catch(() => {}), new Promise<void>(resolve => setTimeout(resolve, restoreWait))]).then(() => {
    settled = true
  })

  const reset = () => {
    for (const id of [...store.threads.keys()]) store.remove(id)
    store.synced.clear()
  }

  const forget = () => {
    const scope = writer.scope()
    writer.use(undefined)
    kept.forget()
    restoredHost = undefined
    reset()
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

  const unwatch = store.watch({
    changed(id) {
      writer.changed(id)
      schedule()
    },
    removed(id) {
      writer.removed(id)
      schedule()
    },
  })

  const flushNow = () => {
    if (!writer.busy()) return
    clearTimeout(timer)
    timer = undefined
    void write()
  }

  const hidden = () => {
    if (document.visibilityState === 'hidden') flushNow()
  }

  ctx.effect(() => {
    addEventListener('visibilitychange', hidden)
    addEventListener('pagehide', flushNow)
    return () => {
      removeEventListener('visibilitychange', hidden)
      removeEventListener('pagehide', flushNow)
      clearTimeout(timer)
      unwatch()
    }
  })

  ctx.on('thread.select', id => {
    if (id) writer.touch(id)
  })

  ctx.on('wire.hello', () => {
    const paired = pairing()
    if (paired) writer.use(scopeOf(paired).key)
    kept.flush()
    schedule()
  })

  ctx.on('wire.state', state => {
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
