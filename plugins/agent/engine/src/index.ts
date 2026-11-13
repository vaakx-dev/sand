import { runtimeDrain, runtimeRelease } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { attachConversations } from './attach'
import { type Conversation, engine, type Engine, entryViews, type Owner, type SendInput, type SendResult } from './contract'
import { inject } from './context'
import { createLeases } from './lifecycle/lease'
import { openStores } from './store'
import { createViews } from './views'

const dispatchEvery = 2_000
const recoverEvery = 30_000
const pruneEvery = 60 * 60 * 1000

interface Attached {
  sweep(): void
  recover(released?: ReadonlySet<string>): void
  open(id: string): Conversation | undefined
  send(id: string, input: SendInput): Promise<SendResult> | undefined
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
    const dispatches = ctx.cli.place === 'runtime'
    let draining = false
    let settled = false
    const ready = () => settled && !draining
    const running = () => dispatches && ready()

    const every = (ms: number, run: () => void) =>
      ctx.effect(() => {
        const timer = setInterval(run, ms)
        return () => clearInterval(timer)
      })

    const service: Engine = {
      attach(conversations) {
        const { owner } = conversations
        if (attached.has(owner)) throw new Error(`${owner} conversations are already attached`)
        const found = attachConversations(ctx, { stores, leases, ready, running }, conversations, () => attached.delete(owner))
        const send = (id: string, input: SendInput) => {
          const conversation = conversations.open(id)
          return conversation && found.runner.send(conversation, input)
        }
        attached.set(owner, { ...found, open: id => conversations.open(id), send })
        found.recover()
        return found.runner
      },
      turn: (owner, id) => stores.turns.get(owner, id),
      open: ({ owner, id }) => attached.get(owner)?.open(id),
      send: ({ owner, id }, input) => attached.get(owner)?.send(id, input),
    }

    if (dispatches) {
      ctx.on(runtimeDrain, () => {
        draining = true
        leases.leave()
      })
      ctx.on(runtimeRelease, ids => {
        const released = new Set(ids)
        setTimeout(() => attached.forEach(found => found.recover(released)))
      })
      every(dispatchEvery, () => attached.forEach(found => found.sweep()))
    }
    every(recoverEvery, () => attached.forEach(found => found.recover()))
    void ctx.settled().then(() => {
      settled = true
      attached.forEach(found => found.sweep())
    })
    stores.receipts.prune()
    every(pruneEvery, stores.receipts.prune)
    ctx.provide(engine, service)
  },
})
