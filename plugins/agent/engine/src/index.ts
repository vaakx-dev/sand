import { runtimeDrain } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { attachConversations } from './attach'
import { type Conversation, engine, type Engine, entryViews, type Owner } from './contract'
import { inject } from './context'
import { createLeases } from './lifecycle/lease'
import { openStores } from './store'
import { createViews } from './views'

const dispatchEvery = 2_000
const recoverEvery = 30_000
const pruneEvery = 60 * 60 * 1000

interface Attached {
  sweep(): void
  recover(): void
  open(id: string): Conversation | undefined
}

export default definePlugin({
  name: 'engine',
  description: 'Runs the turns of every conversation, a thread or a bot: the model replies, the tools it calls run, and it repeats until it is done',
  inject,
  apply(ctx) {
    ctx.provide(entryViews, createViews())
    const stores = openStores(ctx.ledger)
    const leases = createLeases(ctx, stores.turns)
    const attached = new Map<Owner, Attached>()
    let stopped = ctx.cli.place !== 'runtime'
    let settled = false

    const every = (ms: number, run: () => void) =>
      ctx.effect(() => {
        const timer = setInterval(run, ms)
        return () => clearInterval(timer)
      })

    const service: Engine = {
      attach(conversations) {
        const { owner } = conversations
        if (attached.has(owner)) throw new Error(`${owner} conversations are already attached`)
        const found = attachConversations(ctx, { stores, leases, stopped: () => stopped, resumes: () => settled && !stopped }, conversations, () => attached.delete(owner))
        attached.set(owner, { ...found, open: id => conversations.open(id) })
        found.recover()
        return found.runner
      },
      turn: (owner, id) => stores.turns.get(owner, id),
      open: ({ owner, id }) => attached.get(owner)?.open(id),
    }

    if (!stopped) {
      ctx.on(runtimeDrain, () => {
        stopped = true
        leases.drain()
      })
      every(dispatchEvery, () => attached.forEach(found => found.sweep()))
    }
    every(recoverEvery, () => attached.forEach(found => found.recover()))
    void ctx.settled().then(() => {
      settled = true
      attached.forEach(found => found.recover())
    })
    stores.receipts.prune()
    every(pruneEvery, stores.receipts.prune)
    ctx.provide(engine, service)
  },
})
