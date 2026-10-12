import type { SenderEntries, Session } from '@sand/sessions-sqlite/contract'
import type { Pending } from '@sand/steering/contract'
import type { FollowUps } from './contract'
import { errorMessage, promptLabel, sentContent } from '@sand/kit'
import { definePlugin } from 'drydock'
import { serveQueue } from './serve'
import { createStore } from './store'

export default definePlugin({
  name: 'followups',
  description: 'Follow-ups queued while a turn runs; the next one starts when the turn ends',
  inject: ['cli', 'loop', 'sessions'],
  uses: {
    ui: 'follow-ups that fail to start or save fail silently',
    steering: 'a follow-up sent during a turn cannot join it',
    server: 'the page cannot queue follow-ups',
  },
  async apply(ctx) {
    const store = await createStore(ctx.cli.home)
    let live = true
    ctx.effect(() => () => {
      live = false
    })

    const owns = (session: Session) => ctx.runtime?.owns(session.id) ?? true
    const beforePromote = new Set<string>()

    const save = (id: string, items: Pending[]) =>
      void store.set(id, items).catch(error => ctx.ui?.notify(`Follow-ups not saved: ${errorMessage(error)}`, 'error'))

    const change = (session: Session, items: Pending[]) => {
      save(session.id, items)
      ctx.emit('turn.queue', session)
    }

    const take = (session: Session, id: string) => {
      const items = store.get(session.id)
      const found = items.find(item => item.id === id)
      if (found) change(session, items.filter(item => item !== found))
      return found
    }

    const start = (session: Session, item: Pending) => {
      if (item.from) session.append('sent-by', item.from satisfies SenderEntries['sent-by'])
      void ctx.loop.run(session, sentContent(item.prompt, item.from)).catch(error => ctx.ui?.notify(errorMessage(error), 'error'))
    }

    const next = (session: Session) => {
      if (!live || !owns(session) || ctx.loop.active(session)) return
      const [first] = store.get(session.id)
      if (first && take(session, first.id)) start(session, first)
    }

    const followUps: FollowUps = {
      list: session => store.get(session.id),
      add(session, prompt, label, from) {
        const item: Pending = { id: Bun.randomUUIDv7(), label: label ?? promptLabel(prompt), prompt, at: Date.now(), ...(from && { from }) }
        change(session, [...store.get(session.id), item])
        if (!owns(session)) beforePromote.add(session.id)
        else if (!ctx.loop.active(session)) queueMicrotask(() => next(session))
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
        if (!owns(session)) {
          if (ctx.steering?.steer(session, item.prompt, item.label, item.from)) take(session, id)
          return true
        }
        take(session, id)
        if (!ctx.steering?.steer(session, item.prompt, item.label, item.from)) start(session, item)
        return true
      },
    }

    ctx.on('turn.end', (session, result) => {
      if (result.stopReason === 'interrupted' || result.stopReason === 'error') return
      queueMicrotask(() => next(session))
    })
    ctx.on('session.remove', session => save(session.id, []))
    ctx.on('runtime.promote', () => {
      for (const id of beforePromote) {
        const session = ctx.sessions.open(id)
        if (session) next(session)
      }
      beforePromote.clear()
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
