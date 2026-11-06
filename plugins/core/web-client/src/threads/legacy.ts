import { type Prompt, promptLabel, type UserContent, type WireSession } from '@sand/chats/contract'
import type { Wire, WireListen } from '@sand/devices-contract'
import { helloActive, wireEvent } from '@sand/host-hub/contract'
import { loopInterrupt, loopRun, loopSteer, loopUnsteer, type QueueState, queueChange } from '@sand/loop/contract'
import type { SessionSettings } from '@sand/model/contract'
import { helloStarted } from '@sand/server/contract'
import { helloTurnsApi, type PendingItem } from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { Turns } from '../contract'
import type { HelloRead } from '../greeted'
import type { Store } from './store'

const turnSteerWire = wireEvent<[session: WireSession, content: UserContent[], id: string]>('turn.steer')

const everyPc: WireListen = { from: 'all' }

const legacyPc = (wire: Wire, pc: string) => !wire.hello(helloTurnsApi, pc)

export const legacyPending = ({ steers }: QueueState): PendingItem[] => steers.map(steer => ({ ...steer, kind: 'steer', origin: 'user', held: false }))

export const legacyRunning = (read: HelloRead) => {
  const started = read(helloStarted)
  return new Map((read(helloActive) ?? []).map(id => [id, { started: started?.[id] }]))
}

export const listenLegacy = (wire: Wire, store: Store) =>
  joinDisposers(
    wire.on(
      queueChange,
      ([id, state], pc) => {
        if (legacyPc(wire, pc)) store.pending(id, legacyPending(state))
      },
      everyPc,
    ),
    wire.on(
      turnSteerWire,
      ([session, , id], pc) => {
        const thread = store.threads.get(session.$session.id)
        if (thread && legacyPc(wire, pc)) store.pending(thread.id, thread.pending.filter(item => item.id !== id))
      },
      everyPc,
    ),
  )

export const legacyTurns = (wire: Wire, store: Store): Turns => {
  const run = async (id: string, prompt: Prompt, settings?: SessionSettings) => {
    const thread = store.threads.get(id)!
    thread.running = true
    thread.started = Date.now()
    store.changed(id, true)
    const started = store.whenStarted(id)
    const running = wire.call(loopRun, { session: id, prompt, settings })
    running.catch(() => {})
    try {
      await Promise.race([started, running])
    } catch (error) {
      thread.running = false
      thread.started = undefined
      store.changed(id, true)
      throw error
    }
  }

  return {
    async send(id, prompt, { label, settings, mode } = {}) {
      const thread = store.threads.get(id)
      if (!thread) throw new Error(`No thread ${id}`)
      if (mode === 'queue') throw new Error('Update sand on this PC to queue messages for the next turn')
      if (thread.running && (await wire.call(loopSteer, { session: id, prompt, label: promptLabel(label ?? prompt) }))) return
      await run(id, prompt, settings)
    },
    interrupt: id => wire.call(loopInterrupt, { session: id }),
    withdraw: async (id, item) => void (await wire.call(loopUnsteer, { session: id, item })),
    hold: async () => {
      throw new Error('Update sand on this PC to hold messages')
    },
  }
}
