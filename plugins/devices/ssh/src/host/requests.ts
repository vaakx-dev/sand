import type { Caller, Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { type SshPrompt, type SshState, sshAnswer, sshAsk, sshCancel, sshConnect, sshProgress, sshReconnect, sshState } from '../contract'
import type { Attempt } from './setup'

export interface SshService {
  state(): Promise<SshState>
  connect(host: string, attempt: Attempt): Promise<string>
  reconnect(pc: string, attempt: Attempt): Promise<void>
}

interface Running {
  caller: Caller
  controller: AbortController
  asks: Map<string, (value: string | null) => void>
}

export const sshRequests = (hub: Hub, service: SshService): (() => Dispose)[] => {
  const running = new Map<string, Running>()

  const cancel = (entry: Running) => {
    entry.controller.abort()
    for (const answer of entry.asks.values()) answer(null)
    entry.asks.clear()
  }

  const attemptFor = (id: string, entry: Running): Attempt => ({
    caller: entry.caller,
    signal: entry.controller.signal,
    progress: text => hub.tell(entry.caller, sshProgress, { attempt: id, text }),
    ask: (prompt: SshPrompt) =>
      new Promise(resolve => {
        if (entry.controller.signal.aborted) return resolve(null)
        const ask = Bun.randomUUIDv7()
        entry.asks.set(ask, resolve)
        hub.tell(entry.caller, sshAsk, { ...prompt, attempt: id, id: ask })
      }),
  })

  const run = async <T>(id: string, caller: Caller, work: (attempt: Attempt) => Promise<T>) => {
    if (running.has(id)) throw new Error('That connection attempt is already running')
    const entry: Running = { caller, controller: new AbortController(), asks: new Map() }
    running.set(id, entry)
    try {
      return await work(attemptFor(id, entry))
    } finally {
      running.delete(id)
      cancel(entry)
    }
  }

  return [
    () => hub.handle(sshState, () => service.state()),
    () => hub.handle(sshConnect, ({ host, attempt }, caller) => run(attempt, caller, made => service.connect(host, made)).then(pc => ({ pc }))),
    () => hub.handle(sshReconnect, ({ pc, attempt }, caller) => run(attempt, caller, made => service.reconnect(pc, made))),
    () =>
      hub.handle(sshAnswer, ({ attempt, id, value }, caller) => {
        const entry = running.get(attempt)
        if (entry?.caller.device !== caller.device) return
        entry.asks.get(id)?.(value)
        entry.asks.delete(id)
      }),
    () =>
      hub.handle(sshCancel, ({ attempt }, caller) => {
        const entry = running.get(attempt)
        if (entry?.caller.device === caller.device) cancel(entry)
      }),
    () =>
      hub.onLeave(caller => {
        for (const entry of running.values()) if (entry.caller === caller) cancel(entry)
      }),
  ]
}
