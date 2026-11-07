import type { StopReason } from '@sand/chats/contract'
import { type AppCall, type AppOutput, ThreadLost, type Usage } from '../contract'
import { untilAborted } from '@sand/util'

export type Signal =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'call'; call: AppCall }
  | { type: 'usage'; usage: Partial<Usage>; cacheTtlMs?: number }
  | { type: 'pause' }
  | { type: 'finish'; stopReason: StopReason }
  | { type: 'fail'; error: unknown }

export type Signals = ReturnType<typeof createSignals>

export const createSignals = (onExit: () => void = () => {}) => {
  const queued: Signal[] = []
  let waiting: ((signal: Signal) => void) | undefined
  let closed = false

  const push = (signal: Signal) => {
    if (closed) return
    const wake = waiting
    waiting = undefined
    if (wake) wake(signal)
    else queued.push(signal)
  }

  const output: AppOutput = {
    text: text => push({ type: 'text', text }),
    thinking: text => push({ type: 'thinking', text }),
    call: call => push({ type: 'call', call }),
    usage: (usage, cacheTtlMs) => push({ type: 'usage', usage, ...(cacheTtlMs && { cacheTtlMs }) }),
    pause: () => push({ type: 'pause' }),
    finish: (stopReason = 'end_turn') => push({ type: 'finish', stopReason }),
    fail: error => push({ type: 'fail', error }),
    exit(error) {
      onExit()
      push({ type: 'fail', error: new ThreadLost(error.message) })
    },
  }

  const next = (signal?: AbortSignal): Promise<Signal> => {
    const ready = queued.shift()
    if (ready) return Promise.resolve(ready)
    const arrival = new Promise<Signal>(resolve => (waiting = resolve))
    return signal ? untilAborted(arrival, signal) : arrival
  }

  const clear = () => {
    queued.length = 0
    waiting = undefined
  }

  const close = () => {
    closed = true
    clear()
  }

  return { output, next, clear, close }
}
