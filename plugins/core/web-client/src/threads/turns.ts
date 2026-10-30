import type { Prompt } from '@sand/chats/contract'
import { promptLabel } from '@sand/chats/prompt'
import { loopInterrupt, loopRun } from '@sand/server/contract'
import { loopSteer, loopUnsteer } from '@sand/steering/contract'
import type { Wire } from '@sand/devices-contract'
import type { Turns } from '../contract'
import type { Store } from './store'

export const createTurns = (wire: Wire, store: Store): Turns => {
  const run = async (id: string, prompt: Prompt) => {
    const thread = store.threads.get(id)!
    thread.running = true
    thread.started = Date.now()
    store.changed(id, true)
    const started = store.whenStarted(id)
    const running = wire.call(loopRun, { session: id, prompt })
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
    async send(id, prompt, label) {
      const thread = store.threads.get(id)
      if (!thread) throw new Error(`No thread ${id}`)
      const short = promptLabel(label ?? prompt)
      if (thread.running && (await wire.call(loopSteer, { session: id, prompt, label: short }))) return
      await run(id, prompt)
    },
    interrupt: id => wire.call(loopInterrupt, { session: id }),
    withdraw: async (id, item) => void (await wire.call(loopUnsteer, { session: id, item })),
  }
}
