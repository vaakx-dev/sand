import { promptLabel } from '@sand/chats/contract'
import type { Wire } from '@sand/devices-contract'
import { type SendResult, turnHold, turnInterrupt, turnWithdraw } from '@sand/turns-contract/contract'
import type { OutboxItem, Turns } from '../contract'
import type { createOutbox } from '../outbox/outbox'
import { legacyTurns } from './legacy'
import type { Store } from './store'

export const markStarted = (store: Store) => (item: OutboxItem, result: SendResult) => {
  const thread = store.threads.get(item.session)
  if (!thread || result.disposition !== 'started') return
  thread.running = true
  thread.started ??= Date.now()
  store.changed(thread.id, true)
}

export const createTurns = (wire: Wire, store: Store, outbox: ReturnType<typeof createOutbox>): Turns => {
  const current: Turns = {
    async send(id, prompt, { label, settings, mode } = {}) {
      const thread = store.threads.get(id)
      if (!thread) throw new Error(`No thread ${id}`)
      const item = { id: crypto.randomUUID(), session: id, pc: thread.device, prompt, mode, label: promptLabel(label ?? prompt), settings, at: Date.now() }
      await outbox.submit(item)
    },
    interrupt: id => wire.call(turnInterrupt, { session: id }),
    withdraw: async (id, pending) => void (await wire.call(turnWithdraw, { session: id, pending })),
    hold: async (id, pending, held) => void (await wire.call(turnHold, { session: id, pending, held })),
  }
  const legacy = legacyTurns(wire, store)
  const pick = (id: string) => (outbox.service.accepts(store.deviceOf(id)) ? current : legacy)

  return {
    send: (id, prompt, options) => pick(id).send(id, prompt, options),
    interrupt: id => pick(id).interrupt(id),
    withdraw: (id, pending) => pick(id).withdraw(id, pending),
    hold: (id, pending, held) => pick(id).hold(id, pending, held),
  }
}
