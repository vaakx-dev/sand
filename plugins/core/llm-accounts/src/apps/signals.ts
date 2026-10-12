import type { StopReason, Usage } from '@sand/messages'
import type { AppCall, AppOutput } from '../contract'
import { untilAborted } from '@sand/kit'

export type Signal =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'call'; call: AppCall }
  | { type: 'usage'; usage: Partial<Usage> }
  | { type: 'pause' }
  | { type: 'finish'; stopReason: StopReason }
  | { type: 'fail'; error: unknown }

export type Signals = ReturnType<typeof createSignals>

export const createSignals = () => {
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
    usage: usage => push({ type: 'usage', usage }),
    pause: () => push({ type: 'pause' }),
    finish: (stopReason = 'end_turn') => push({ type: 'finish', stopReason }),
    fail: error => push({ type: 'fail', error }),
  }

  const next = (signal?: AbortSignal): Promise<Signal> => {
    const ready = queued.shift()
    if (ready) return Promise.resolve(ready)
    const arrival = new Promise<Signal>(resolve => (waiting = resolve))
    return signal ? untilAborted(arrival, signal) : arrival
  }

  const close = () => {
    closed = true
    queued.length = 0
    waiting = undefined
  }

  return { output, next, close }
}
