import { replyImages } from '@sand/images/contract'
import { models, type Thread } from '@sand/web-client/contract'
import { div, sig, untrack } from '@vaakx-dev/vrui'
import type { ChatContext } from './context'
import { failed, hero, loading } from './hero'
import { findQuote, quoteFlash } from './integrations/quote-jump'
import { firstRowBelow, keepAnchor, scrollTo, stickToEnd } from './integrations/scroll'
import { rowSizes } from './integrations/sizes'
import { topEdge } from './integrations/top-edge'
import type { OpenStates, RendererRegistry, TranscriptParts } from './parts/contract'
import { pendingRows } from './rows/pending'
import { replyActions } from './rows/reply'
import { rewriteActions } from './rows/rewrite'
import type { RowContext } from './rows/row'
import { slotHost } from './slot'
import { foldTurns } from './turns/fold'
import { shownRows } from './turns/rows'
import { threadViews, type ThreadView } from './view'
import { fetchWithin, growStep, resetToEnd, trimAt, windowed } from './window'

const screensKeptAbove = 3
const fewestTrimmed = 20

export const chatController = (ctx: ChatContext, parts: TranscriptParts, registry: RendererRegistry, states: OpenStates) => {
  const { contextMenu, jumpButton, nearEnd, toEnd } = ctx.kit
  const cache = parts.itemCache()
  const jumpShown = sig(false)
  const slot = slotHost()
  const menu = contextMenu()
  const views = threadViews(ctx.kit, node => watchRow(node))
  const edge = topEdge(
    () => reveal(),
    () => trim(),
  )
  const empty = hero(ctx)
  let shown: ThreadView | undefined
  let pinned = true

  const onScroll = () => {
    if (!shown) return
    pinned = nearEnd(scroller)
    jumpShown.set(!pinned)
    edge.scrolled()
  }
  const scroller = div({ class: 'relative z-0 min-h-0 flex-1 overflow-auto overscroll-contain', onScroll }, edge.sentinel, slot.node, views.node)
  const watchRow = rowSizes(scroller, () => pinned)
  edge.watch(scroller)

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
  }

  const repaint = () => {
    const thread = ctx.threads.current()
    if (thread && shown?.id === thread.id) paint(thread, shown)
  }

  const paint = (thread: Thread, view: ThreadView, grow = 0) => {
    const context: RowContext = {
      kit: ctx.kit,
      registry,
      states,
      thread: thread.id,
      parts,
      markdown: ctx.markdown,
      images: at => ctx.get(replyImages)?.forReply(thread.id, at),
      menu,
      rewrite: (entry, text) => rewriteActions(ctx, thread.id, entry, text),
      reply: text => replyActions(ctx, text),
      jump,
      repaint,
    }
    const items = cache.items(thread, () => ctx.threads.path(thread.id), type => Boolean(registry.entryRenderer(type)), settings => ctx.get(models)?.summary(settings))
    const folded = foldTurns(items, {
      older: ctx.threads.older(thread.id),
      running: thread.running,
      streaming: thread.live.length > 0,
      started: thread.started,
      open: key => untrack(() => states.get(key).open.get()),
    })
    const drawn = windowed(view, folded, grow).flatMap(entry => shownRows(entry, context).map(row => ({ row, entry: entry.key })))
    view.rowEntries = drawn.map(({ entry }) => entry)
    view.more.set(view.above > 0 || ctx.threads.older(thread.id))
    view.rows.set([...drawn.map(({ row }) => row), ...pendingRows(ctx, thread, context)])
  }

  const shownThread = () => {
    const thread = ctx.threads.current()
    const view = shown
    return thread && view?.id === thread.id ? { thread, view } : undefined
  }

  const reveal = () => {
    const found = shownThread()
    if (!found || !scroller.clientHeight) return false
    const { thread, view } = found
    if (view.above < fetchWithin && ctx.threads.older(thread.id)) void ctx.threads.page(thread.id)
    if (!view.above) return false
    keepAnchor(scroller, view.rowList, () => paint(thread, view, growStep))
    return true
  }

  const trim = () => {
    const found = shownThread()
    if (!found || pinned) return
    const { thread, view } = found
    const index = firstRowBelow(view.rowList, scroller.getBoundingClientRect().top - screensKeptAbove * scroller.clientHeight)
    const first = view.rowEntries[index]
    if (index < fewestTrimmed || !first) return
    view.first = first
    keepAnchor(scroller, view.rowList, () => paint(thread, view))
  }

  const render = (): void => {
    const thread = ctx.threads.current()
    if (!thread || (thread.loaded && !thread.entries.size && !thread.live.length)) return showSlot('empty', () => empty)
    if (!thread.loaded && !thread.entries.size) {
      const problem = thread.failed
      if (!problem) return showSlot('loading', () => loading(ctx.kit))
      return showSlot(`failed:${thread.id}:${problem}`, () => failed(ctx.kit, problem, () => void ctx.threads.load(thread.id)))
    }
    const switching = shown?.id !== thread.id
    const view = showThread(thread.id)
    const saved = switching ? view.scroll : undefined
    const tail = switching ? saved === undefined : nearEnd(scroller)
    if (tail && view.size > trimAt) resetToEnd(view)
    if (switching || tail) paint(thread, view)
    else keepAnchor(scroller, view.rowList, () => paint(thread, view))
    if (saved !== undefined) scrollTo(scroller, saved)
    else if (tail) stickToEnd(scroller)
    pinned = nearEnd(scroller)
    jumpShown.set(!pinned)
    edge.pump()
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
