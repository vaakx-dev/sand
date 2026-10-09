import type { WireRequest } from '@sand/protocol'
import type { Prompt } from '@sand/messages'
import type { Turns, Wire } from '../contract'
import { promptLabel } from '@sand/kit'
import type { Store } from './store'

export const createTurns = (wire: Wire, store: Store): Turns => {
  const call = (request: WireRequest) => wire.call(request).then(() => undefined)

  const run = async (id: string, prompt: Prompt) => {
    const thread = store.threads.get(id)!
    thread.running = true
    thread.started = Date.now()
    store.changed(id, true)
    const started = store.whenStarted(id)
    const running = wire.call({ type: 'loop.run', session: id, prompt })
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
    async send(id, prompt, label, mode = 'queue') {
      const thread = store.threads.get(id)
      if (!thread) throw new Error(`No thread ${id}`)
      const short = promptLabel(label ?? prompt)
      if (thread.running && mode === 'queue') return call({ type: 'queue.add', session: id, prompt, label: short })
      if (thread.running && (await wire.call<string | null>({ type: 'loop.steer', session: id, prompt, label: short }))) return
      await run(id, prompt)
    },
    interrupt: id => wire.call<boolean>({ type: 'loop.interrupt', session: id }),
    withdraw(id, item) {
      const steer = store.threads.get(id)?.queued.some(entry => entry.id === item)
      return call(steer ? { type: 'loop.unsteer', session: id, item } : { type: 'queue.remove', session: id, item })
    },
    edit: (id, item, prompt, label) => call({ type: 'queue.edit', session: id, item, prompt, label: promptLabel(label ?? prompt) }),
    move: (id, item, index) => call({ type: 'queue.move', session: id, item, index }),
    promote: (id, item) => call({ type: 'queue.send', session: id, item }),
  }
}
