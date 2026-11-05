import { promptLabel } from '@sand/chats/contract'
import { isPcUnavailable, type Wire } from '@sand/devices-contract'
import { type SendResult, turnHold, turnInterrupt, turnSend, turnWithdraw } from '@sand/turns-contract/contract'
import type { Turns } from '../contract'
import { after } from '../detached'
import { legacyPc, legacyTurns } from './legacy'
import type { Store } from './store'

const attempts = 4
const retryDelay = 2_000

const wait = (ms: number) => new Promise<void>(resolve => after(ms, resolve))

const unanswered = (error: unknown) => isPcUnavailable(error) || (error instanceof Error && error.name === 'TimedOut')

const retried = async (call: () => Promise<SendResult>) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call()
    } catch (error) {
      if (attempt === attempts || !unanswered(error)) throw error
      await wait(retryDelay)
    }
  }
}

export const createTurns = (wire: Wire, store: Store): Turns => {
  const current: Turns = {
    async send(id, prompt, { label, settings, mode } = {}) {
      const thread = store.threads.get(id)
      if (!thread) throw new Error(`No thread ${id}`)
      const input = { session: id, prompt, mode, label: promptLabel(label ?? prompt), settings, clientRequestId: crypto.randomUUID() }
      const result = await retried(() => wire.call(turnSend, input))
      if (result.disposition !== 'started') return
      thread.running = true
      thread.started ??= Date.now()
      store.changed(id, true)
    },
    interrupt: id => wire.call(turnInterrupt, { session: id }),
    withdraw: async (id, pending) => void (await wire.call(turnWithdraw, { session: id, pending })),
    hold: async (id, pending, held) => void (await wire.call(turnHold, { session: id, pending, held })),
  }
  const legacy = legacyTurns(wire, store)
  const pick = (id: string) => (legacyPc(wire, store.deviceOf(id)) ? legacy : current)

  return {
    send: (id, prompt, options) => pick(id).send(id, prompt, options),
    interrupt: id => pick(id).interrupt(id),
    withdraw: (id, pending) => pick(id).withdraw(id, pending),
    hold: (id, pending, held) => pick(id).hold(id, pending, held),
  }
}
