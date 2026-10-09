import type { FollowUps, Pending, Session } from '@sand/protocol'
import { sandHome } from '@sand/host'
import { errorMessage, promptLabel } from '@sand/kit'
import { definePlugin } from 'drydock'
import { serveQueue } from './serve'
import { createStore } from './store'

export default definePlugin({
  name: 'followups',
  description: 'Follow-ups queued while a turn runs; the next one starts when the turn ends',
  inject: ['loop', 'sessions'],
  async apply(ctx) {
    const store = await createStore(sandHome(ctx))
    let live = true
    let draining = false
    ctx.effect(() => () => {
      live = false
    })

    const change = (session: Session, items: Pending[]) => {
      store.set(session.id, items)
      ctx.emit('turn.queue', session)
    }

    const take = (session: Session, id: string) => {
      const items = store.get(session.id)
      const found = items.find(item => item.id === id)
      if (found) change(session, items.filter(item => item !== found))
      return found
    }

    const start = (session: Session, item: Pending) =>
      void ctx.loop.run(session, item.prompt).catch(error => ctx.ui?.notify(errorMessage(error), 'error'))

    const followUps: FollowUps = {
      list: session => store.get(session.id),
      add(session, prompt, label) {
        const item: Pending = { id: Bun.randomUUIDv7(), label: label ?? promptLabel(prompt), prompt, at: Date.now() }
        change(session, [...store.get(session.id), item])
        if (!draining && !ctx.loop.active(session)) queueMicrotask(() => next(session))
        return item
      },
      remove: (session, id) => Boolean(take(session, id)),
      edit(session, id, prompt, label) {
        const items = store.get(session.id)
        if (!items.some(item => item.id === id)) return false
        change(session, items.map(item => (item.id === id ? { ...item, prompt, label: label ?? promptLabel(prompt) } : item)))
        return true
      },
      move(session, id, index) {
        const items = store.get(session.id)
        const found = items.find(item => item.id === id)
        if (!found) return false
        const rest = items.filter(item => item !== found)
        rest.splice(Math.max(0, Math.min(index, rest.length)), 0, found)
        change(session, rest)
        return true
      },
      send(session, id) {
        const item = store.get(session.id).find(item => item.id === id)
        if (!item) return false
        if (draining) {
          if (ctx.loop.steer(session, item.prompt, item.label)) take(session, id)
          return true
        }
        take(session, id)
        if (!ctx.loop.steer(session, item.prompt, item.label)) start(session, item)
        return true
      },
    }

    const next = (session: Session) => {
      if (!live || draining || ctx.loop.active(session)) return
      const [first] = store.get(session.id)
      if (first && take(session, first.id)) start(session, first)
    }

    ctx.on('turn.end', (session, result) => {
      if (result.stopReason === 'interrupted' || result.stopReason === 'error') return
      queueMicrotask(() => next(session))
    })
    ctx.on('session.remove', session => store.set(session.id, []))
    ctx.on('runtime.drain', () => {
      draining = true
    })
    ctx.on('runtime.release', async ids => {
      for (const id of ids) {
        await store.refresh(id)
        const session = ctx.sessions.open(id)
        if (!session || !live) continue
        ctx.emit('turn.queue', session)
        next(session)
      }
    })
    ctx.provide('followUps', followUps)
    serveQueue(ctx, followUps)
  },
})
