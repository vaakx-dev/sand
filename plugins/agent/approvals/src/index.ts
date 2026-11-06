import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { ledger } from '@sand/ledger/contract'
import { engine, type Owner } from '@sand/engine/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { approvalAsked, approvals, approvalsChange, approvalSettingsChange, type Approvals, type Decision } from './contract'
import { createGate } from './gate'
import { serveApprovals } from './serve'
import { openStores } from './store'
import { createWaiters } from './waiters'

const keepFor = 90 * 24 * 60 * 60 * 1000
const pruneEvery = 60 * 60 * 1000

export default definePlugin({
  name: 'approvals',
  description:
    'Decides whether each tool call may run: rules and defaults by what the call does, asking the user when needed, and a log of every decision',
  inject: { ledger, tools, engine },
  apply(ctx) {
    const stores = openStores(ctx.ledger)
    const waiters = createWaiters(id => {
      const found = stores.decisions.get(id)
      return found?.outcome === 'waiting' ? undefined : found
    })
    ctx.effect(() => waiters.stop)

    const live = ({ owner, turn }: Decision) => {
      const info = ctx.engine.turn(owner, turn)
      return info !== undefined && info.ended === undefined
    }
    const waiting = () => stores.decisions.waiting().filter(live)
    const changed = () => ctx.emit(approvalsChange, waiting())
    const settingsChanged = () => ctx.emit(approvalSettingsChange)
    const title = (owner: Owner, id: string) => (owner === 'thread' ? ctx.get(sessions)?.open(id)?.title : ctx.get(bots)?.get(id)?.name) || id

    const service: Approvals = {
      waiting,
      answer(id, answer) {
        const settled = ctx.ledger.tx(() => {
          const found = stores.decisions.get(id)
          if (!found) throw new Error('No such approval')
          const { owner, conversation, title, tool, effect } = found
          const rule = answer === 'always' ? stores.rules.add({ owner, conversation, title, tool, effect, verdict: 'allow' }) : undefined
          const done = stores.decisions.settle(id, { outcome: answer === 'deny' ? 'denied' : 'allowed', by: 'user', ...(rule && { rule: rule.id }) })
          if (!done) throw new Error('This call is no longer waiting for an answer')
          return done
        })
        waiters.wake()
        changed()
        if (answer === 'always') settingsChanged()
        return settled
      },
      decisions: query => stores.decisions.list(query),
      rules: () => stores.rules.list(),
      addRule(rule) {
        const added = stores.rules.add(rule)
        settingsChanged()
        return added
      },
      removeRule(id) {
        const removed = stores.rules.remove(id)
        if (removed) settingsChanged()
        return removed
      },
      mode: () => stores.settings.mode(),
      setMode(mode) {
        stores.settings.setMode(mode)
        settingsChanged()
      },
    }

    ctx.effect(() =>
      ctx.tools.gate(
        createGate({
          stores,
          waiters,
          title,
          asked(decision) {
            ctx.emit(approvalAsked, decision)
            changed()
          },
          cancel(id) {
            if (stores.decisions.settle(id, { outcome: 'cancelled' })) changed()
          },
        }),
      ),
    )
    ctx.effect(() => {
      const prune = () => stores.decisions.prune(Date.now() - keepFor)
      prune()
      const timer = setInterval(prune, pruneEvery)
      return () => clearInterval(timer)
    })
    ctx.provide(approvals, service)
    ctx.watch(server, found => (found ? serveApprovals(ctx, found, service) : undefined))
  },
})
