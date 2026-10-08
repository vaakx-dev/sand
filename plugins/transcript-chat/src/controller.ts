import type { Thread } from '@sand/protocol'
import { jumpButton, nearEnd, threadItems, toEnd, type OpenStates, type RendererRegistry } from '@sand/conversation'
import { div, sig } from '@sand/dom'
import type { Context } from 'drydock'
import { failed, hero, loading } from './hero'
import { fill, keepAnchor, savedScroll, scrollTo } from './integrations/scroll'
import { itemRows, type RowContext } from './rows'
import { slotHost } from './slot'
import { Views, type ThreadView } from './view'
import { pageSize, windowed } from './window'

export const chatController = (ctx: Context<'threads'>, registry: RendererRegistry, states: OpenStates) => {
  const jumpShown = sig(false)
  const slot = slotHost()
  const empty = hero(ctx)
  let shown: { id: string; view: ThreadView } | undefined
  let pinned = true

  const onScroll = () => {
    if (shown) {
      pinned = nearEnd(scroller)
      jumpShown.set(!pinned)
    }
    fill(scroller, reveal)
  }
  const scroller = div({ class: 'relative min-h-0 flex-1 overflow-auto', style: { overflowAnchor: 'none' }, onScroll }, slot.node)
  scroller.addEventListener(
    'load',
    event => {
      if (pinned && event.target instanceof HTMLImageElement) toEnd(scroller)
    },
    true,
  )
  const views = new Views(scroller)

  const scrollToEnd = () => {
    toEnd(scroller)
    pinned = true
    jumpShown.set(false)
  }

  const stash = () => {
    if (!shown) return
    shown.view.scroll = savedScroll(scroller)
    shown.view.visible.set(false)
    shown = undefined
  }

  const showSlot = (key: string, build: () => HTMLElement) => {
    stash()
    jumpShown.set(false)
    slot.show(key, build)
  }

  const showThread = (id: string) => {
    if (shown?.id === id) return shown.view
    stash()
    slot.clear()
    const next = views.get(id)
    next.visible.set(true)
    shown = { id, view: next }
    return next
  }

  const paint = (thread: Thread, current: ThreadView, grow = 0) => {
    const context: RowContext = { registry, states, thread: thread.id }
    const items = threadItems(thread, ctx.threads.path(thread.id), type => Boolean(registry.entryRenderer(type)), settings => ctx.models?.summary(settings))
    current.rows.set(windowed(current, items, grow).flatMap(item => itemRows(item, context)))
  }

  const reveal = () => {
    const thread = ctx.threads.current()
    if (!thread || !shown || shown.id !== thread.id || !shown.view.truncated) return false
    const current = shown.view
    keepAnchor(scroller, current.column, () => {
      current.painted.done = false
      paint(thread, current, pageSize)
      current.painted.done = true
    })
    return true
  }

  const render = (): void => {
    const thread = ctx.threads.current()
    if (!thread || (thread.loaded && !thread.entries.size && !thread.live.length)) return showSlot('empty', () => empty)
    if (!thread.loaded && !thread.entries.size) {
      const problem = thread.failed
      if (!problem) return showSlot('loading', loading)
      return showSlot(`failed:${thread.id}:${problem}`, () => failed(problem, () => void ctx.threads.load(thread.id)))
    }
    const switching = shown?.id !== thread.id
    const current = showThread(thread.id)
    const restoring = switching && current.scroll !== undefined
    const tail = switching ? !restoring : nearEnd(scroller)
    if (tail && (switching || current.size > 2 * pageSize)) current.first = undefined
    paint(thread, current)
    current.painted.done = true
    if (restoring) scrollTo(scroller, current.scroll!)
    else if (tail) toEnd(scroller)
    fill(scroller, reveal)
    pinned = nearEnd(scroller)
    jumpShown.set(!pinned)
  }

  const forget = () => {
    const gone = views.ids().filter(id => !ctx.threads.get(id))
    if (!gone.length) return
    for (const id of gone) {
      if (shown?.id === id) shown = undefined
      views.drop(id)
    }
    render()
  }

  const clear = () => {
    slot.clear()
    views.clear()
  }

  const root = div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, jumpButton(jumpShown, scrollToEnd))
  return { root, render, forget, scrollToEnd, clear }
}
