import type { OpenStates, RendererRegistry } from '@sand/transcript-parts/contract'
import type { Thread } from '@sand/web-client/contract'
import { contextMenu, div, jumpButton, listen, nearEnd, sig, toEnd, untrack } from '@sand/dom'
import type { Context } from 'drydock'
import { failed, hero, loading } from './hero'
import { findQuote, quoteFlash } from './integrations/quote-jump'
import { fill, keepAnchor, scrollTo } from './integrations/scroll'
import { replyActions } from './rows/reply'
import { rewriteActions } from './rows/rewrite'
import type { RowContext } from './rows/row'
import { slotHost } from './slot'
import { foldTurns } from './turns/fold'
import { shownRows } from './turns/rows'
import { threadViews, type ThreadView } from './view'
import { pageSize, windowed } from './window'

export const chatController = (ctx: Context<'threads' | 'transcriptParts' | 'markdown'>, registry: RendererRegistry, states: OpenStates) => {
  const parts = ctx.transcriptParts
  const cache = parts.itemCache()
  const jumpShown = sig(false)
  const slot = slotHost()
  const menu = contextMenu()
  const views = threadViews()
  const empty = hero(ctx)
  let shown: ThreadView | undefined
  let pinned = true

  const onScroll = () => {
    if (shown) {
      pinned = nearEnd(scroller)
      jumpShown.set(!pinned)
    }
    fill(scroller, reveal)
  }
  const scroller = div({ class: 'relative z-0 min-h-0 flex-1 overflow-auto', style: { overflowAnchor: 'none' }, onScroll }, slot.node, views.node)
  listen(
    scroller,
    'load',
    event => {
      if (pinned && event.target instanceof HTMLImageElement) toEnd(scroller)
    },
    true,
  )

  const scrollToEnd = () => {
    toEnd(scroller)
    pinned = true
    jumpShown.set(false)
  }

  const stash = () => {
    if (!shown) return
    shown.scroll = nearEnd(scroller) ? undefined : scroller.scrollTop
    shown.visible.set(false)
    shown = undefined
  }

  const showSlot = (key: string, build: () => HTMLElement) => {
    stash()
    jumpShown.set(false)
    slot.show(key, build)
  }

  const showThread = (id: string) => {
    if (shown?.id === id) return shown
    stash()
    slot.clear()
    shown = views.get(id)
    shown.visible.set(true)
    return shown
  }

  const flash = quoteFlash(scroller)
  const jump = (from: Element, quote: string) => {
    const range = shown && findQuote(shown.rowList, from, quote)
    if (range) flash(range)
    else ctx.notify?.push("Couldn't find the quoted text in the messages above", { level: 'info' })
  }

  const repaint = () => {
    const thread = ctx.threads.current()
    if (thread && shown?.id === thread.id) paint(thread, shown)
  }

  const paint = (thread: Thread, view: ThreadView, grow = 0) => {
    const context: RowContext = {
      registry,
      states,
      thread: thread.id,
      parts,
      markdown: ctx.markdown,
      images: () => ctx.replyImages?.forReply(thread.id),
      menu,
      rewrite: (entry, text) => rewriteActions(ctx, thread.id, entry, text),
      reply: text => replyActions(ctx, text),
      jump,
      repaint,
    }
    const items = cache.items(thread, () => ctx.threads.path(thread.id), type => Boolean(registry.entryRenderer(type)), settings => ctx.models?.summary(settings))
    const folded = foldTurns(items, {
      running: thread.running,
      streaming: thread.live.length > 0,
      started: thread.started,
      open: key => untrack(() => states.get(key).open.get()),
    })
    view.rows.set(windowed(view, folded, grow).flatMap(entry => shownRows(entry, context)))
  }

  const reveal = () => {
    const thread = ctx.threads.current()
    const view = shown
    if (!thread || view?.id !== thread.id) return false
    if (!view.truncated) {
      if (ctx.threads.older(thread.id)) void ctx.threads.page(thread.id)
      return false
    }
    keepAnchor(scroller, view.rowList, () => {
      view.animate = false
      paint(thread, view, pageSize)
      view.animate = true
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
    const view = showThread(thread.id)
    const saved = switching ? view.scroll : undefined
    const tail = switching ? saved === undefined : nearEnd(scroller)
    if (tail && (switching || view.size > 2 * pageSize)) view.first = undefined
    paint(thread, view)
    view.animate = true
    if (saved !== undefined) scrollTo(scroller, saved)
    else if (tail) toEnd(scroller)
    fill(scroller, reveal)
    pinned = nearEnd(scroller)
    jumpShown.set(!pinned)
  }

  const forget = () => {
    const current = ctx.threads.current()?.id
    const gone = views.ids().filter(id => id !== current && !ctx.threads.get(id)?.entries.size)
    if (!gone.length) return
    for (const id of gone) {
      if (shown?.id === id) shown = undefined
      views.drop(id)
    }
    render()
  }

  const refresh = () => {
    cache.reset()
    render()
  }

  const root = div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, jumpButton(jumpShown, scrollToEnd), menu.view())
  return { root, render, refresh, forget, stale: cache.reset }
}
