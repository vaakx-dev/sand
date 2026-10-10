import type { DraftTarget } from '@sand/web-client/contract'
import type { Drafts } from '../contract'
import { effect, onTimeout, untrack } from '@sand/dom'
import type { Context } from 'drydock'
import type { Model } from '../model'
import { createListed } from './listed'
import { createStore, isBlank, type Saved } from './store'

interface Key {
  id: string
  target?: DraftTarget
}

const keyOf = (ctx: Context<'threads'>, id: string | undefined): Key | undefined => {
  if (id) return { id }
  const target = ctx.threads.drafting()
  return target && { id: target.id, target }
}

export const draftSession = (ctx: Context<'threads'>, model: Model, switched: () => void) => {
  const store = createStore()
  const listed = createListed(ctx)
  let key = keyOf(ctx, ctx.threads.current()?.id)
  let ready = false
  let sent: { id: string; text: string } | undefined

  const snapshot = (): Saved => model.draft()

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
    const saved = snapshot()
    publish(saved, leaving)
    store.save(key.id, { ...saved, target: key.target, updated: listed.updated(key.id) ?? Date.now() })
  }

  const restore = async (next: Key) => {
    const saved = await store.load(next.id)
    if (next !== key) return
    if (!isBlank(saved)) {
      model.text.set(saved.text)
      model.files.set(saved.items)
    }
    ready = true
  }

  const retarget = (next: Key | undefined) => {
    if (!key || !next?.target || next.target === key.target) return
    key.target = next.target
    keep()
  }

  const promotes = (next: Key | undefined) =>
    Boolean(model.sending.get() && key?.target && next && !next.target && !ctx.threads.get(next.id)?.info.head)

  const open = (id: string | undefined) => {
    const next = keyOf(ctx, id)
    if (next?.id === key?.id) return retarget(next)
    if (promotes(next)) {
      drop(key!.id)
      key = next
      return
    }
    model.cancelEdit()
    keep(true)
    key = next
    ready = false
    model.clear()
    model.failure.set(undefined)
    switched()
    if (next) void restore(next)
  }

  const load = async () => {
    for (const saved of await store.all()) if (saved.target && !isBlank(saved)) listed.set(saved.target, saved, saved.updated)
  }

  effect(() => {
    const saved = snapshot()
    if (!ready) return
    untrack(() => publish(saved, false))
    return onTimeout(() => keep(), 300)
  })

  effect(() => {
    if (model.sending.get()) {
      sent = key ? { id: key.id, text: untrack(() => model.text.get()) } : undefined
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
