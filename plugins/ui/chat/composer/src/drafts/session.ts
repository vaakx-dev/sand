import type { DraftTarget } from '@sand/web-client/contract'
import { effect, onTimeout, untrack } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import type { DraftStore, Drafts } from '../contract'
import type { Model } from '../model'
import { createListed } from './listed'
import { createStore, isBlank, type Saved } from './store'

interface Key {
  id: string
  target?: DraftTarget
}

const keyOf = (ctx: ComposerContext, id: string | undefined): Key | undefined => {
  if (id) return { id }
  const target = ctx.threads.drafting()
  return target && { id: target.id, target }
}

export const draftSession = (ctx: ComposerContext, model: Model, remote: () => DraftStore | undefined, switched: () => void) => {
  const store = createStore(remote, model.upload)
  const listed = createListed(ctx)
  let key = keyOf(ctx, ctx.threads.current()?.id)
  let ready = false
  let sent: { id: string; text: string } | undefined

  const drop = (id: string) => {
    store.remove(id)
    listed.delete(id)
  }

  const publish = (saved: Saved, leaving: boolean) => {
    if (!key?.target) return
    if (isBlank(saved)) listed.delete(key.id)
    else if (leaving || listed.has(key.id)) listed.set(key.target, saved)
  }

  const keep = (leaving = false) => {
    if (!key || !ready) return
    const saved = model.draft()
    publish(saved, leaving)
    store.save(key.id, { ...saved, target: key.target, updated: listed.updated(key.id) ?? Date.now() })
  }

  const restore = async (next: Key) => {
    const saved = await store.load(next.id)
    if (next !== key) return
    if (!isBlank(saved) && model.empty.get()) model.fill(saved)
    ready = true
  }

  const retarget = (next: Key | undefined) => {
    if (!key || !next?.target || next.target === key.target) return
    key.target = next.target
    keep()
  }

  const promotes = (next: Key | undefined) =>
    Boolean(model.sending.get() && key?.target && next && !next.target && !ctx.threads.get(next.id)?.info.head)

  const settle = (first: Key) => {
    key = first
    ready = true
    keep()
  }

  const open = (id: string | undefined) => {
    const next = keyOf(ctx, id)
    if (next?.id === key?.id) return retarget(next)
    if (!key && next && !isBlank(model.draft())) return settle(next)
    if (key && next && promotes(next)) {
      drop(key.id)
      if (sent?.id === key.id) sent = { ...sent, id: next.id }
      key = next
      return
    }
    keep(true)
    key = next
    ready = false
    model.reset()
    switched()
    if (next) void restore(next)
  }

  const load = async () => {
    for (const saved of await store.all()) if (saved.target && !isBlank(saved)) listed.set(saved.target, saved, saved.updated)
  }

  effect(() => {
    const saved = model.draft()
    if (!ready) return
    untrack(() => publish(saved, false))
    return onTimeout(() => keep(), 300)
  })

  effect(() => {
    if (model.sending.get()) {
      sent = key ? { id: key.id, text: untrack(() => model.draft().text) } : undefined
      return
    }
    const done = sent
    sent = undefined
    if (!done || done.id === key?.id || untrack(() => model.failure.get())) return
    if (store.peek(done.id)?.text === done.text) drop(done.id)
  })

  const drafts: Drafts = {
    list: listed.list,
    remove(id) {
      drop(id)
      if (key?.id === id) model.clear()
    },
  }

  return {
    drafts,
    open,
    keep: () => keep(),
    start() {
      if (key) void restore(key)
      void load()
    },
  }
}
