import { promptLabel } from '@sand/chats/contract'
import type { Wire } from '@sand/devices-contract'
import { type PendingAction, threadPending, threadStop } from '@sand/orchestrator/contract'
import type { SendResult } from '@sand/turns-contract/contract'
import type { OutboxItem, Turns } from '../contract'
import type { createOutbox } from '../outbox/outbox'
import type { Store } from './store'

export const markStarted = (store: Store) => (item: OutboxItem, result: SendResult) => {
  const thread = store.threads.get(item.session)
  if (!thread || result.disposition !== 'started') return
  thread.running = true
  thread.started ??= Date.now()
  store.changed(thread.id, true)
}

export const createTurns = (wire: Wire, store: Store, outbox: ReturnType<typeof createOutbox>): Turns => {
  const changePending = async (id: string, pending: string, action: PendingAction) => void (await wire.call(threadPending, { session: id, pending, action }))

  return {
    async send(id, prompt, { label, settings, mode, clientRequestId = crypto.randomUUID() } = {}) {
      const thread = store.threads.get(id)
      if (!thread) throw new Error(`No thread ${id}`)
      const item = { id: clientRequestId, session: id, pc: thread.device, prompt, mode, label: promptLabel(label ?? prompt), settings, at: Date.now() }
      store.sending(id, [...thread.sending, item])
      try {
        await outbox.submit(item)
      } finally {
        store.sending(id, thread.sending.filter(other => other !== item))
      }
    },
    stop: id => wire.call(threadStop, { session: id }),
    withdraw: (id, pending) => changePending(id, pending, 'withdraw'),
    hold: (id, pending, held) => changePending(id, pending, held ? 'hold' : 'release'),
  }
}
