import type { AgentAction, Driver, HistoryAction, Logs, Picked, Point, TabState, UserInput, Viewport } from '@sand/browser-engine/contract'
import type { WireRequest } from '@sand/protocol'
import { derive, sig, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { rootKey, sameKey, type TabKey } from './root'

export interface SeenAction extends AgentAction {
  seen: number
}

export const tabModel = (ctx: Context<'threads' | 'wire'>, opened: () => void) => {
  const key = sig<TabKey | undefined>(undefined)
  const state = sig<TabState | null>(null)
  const action = sig<SeenAction | undefined>(undefined)
  const open = derive(() => state.get() !== null)
  let asked = 0
  let known = false

  const call = <T>(make: (thread: string) => WireRequest) => {
    const target = untrack(() => key.get())
    return target ? ctx.wire.call<T>(make(target.thread), target.device) : Promise.reject(new Error('No thread is selected'))
  }

  const replace = (next: TabState | null) => {
    if (next?.thread !== state.get()?.thread) action.set(undefined)
    state.set(next)
  }

  const change = (next: TabState) => {
    const was = state.get()
    const first = !was && known
    asked++
    known = true
    if (next.action && next.action.at !== was?.action?.at) action.set({ ...next.action, seen: Date.now() })
    state.set(next)
    if (first) opened()
  }

  const closed = () => {
    asked++
    known = true
    replace(null)
  }

  const refresh = async () => {
    const ticket = ++asked
    const next = await call<TabState | null>(thread => ({ type: 'browser.state', thread })).catch(() => null)
    if (ticket !== asked) return
    known = true
    replace(next)
  }

  const follow = () => {
    const next = rootKey(ctx.threads)
    if (sameKey(next, key.get())) return
    key.set(next)
    known = false
    replace(null)
    void refresh()
  }

  ctx.on('thread.select', follow)
  ctx.on('threads.change', follow)
  ctx.on('wire.hello', () => void refresh())
  ctx.on('wire.event', event => {
    const thread = key.get()?.thread
    if (event.name === 'browser.change' && event.args[0].thread === thread) change(event.args[0])
    if (event.name === 'browser.close' && event.args[0] === thread) closed()
  })
  follow()

  return {
    key,
    state,
    action,
    open,
    refresh,
    frames: (target: TabKey, signal: AbortSignal) =>
      ctx.wire.fetch(`/browser/frames?thread=${encodeURIComponent(target.thread)}`, { signal }, target.device),
    load: (url: string) => call(thread => ({ type: 'browser.open', thread, url })),
    history: (move: HistoryAction) => call(thread => ({ type: 'browser.history', thread, action: move })),
    input: (input: UserInput) => call(thread => ({ type: 'browser.input', thread, input })),
    control: (driver: Driver) => call(thread => ({ type: 'browser.control', thread, driver })),
    resize: (viewport: Viewport) => call(thread => ({ type: 'browser.resize', thread, viewport })),
    inspect: (point?: Point) => call(thread => ({ type: 'browser.inspect', thread, point })),
    pick: (point: Point) => call<Picked>(thread => ({ type: 'browser.pick', thread, point })),
    logs: () => call<Logs>(thread => ({ type: 'browser.logs', thread })),
  }
}

export type TabModel = ReturnType<typeof tabModel>
