import { composer } from '@sand/composer/contract'
import { joinDisposers } from '@sand/util'
import { modelsChange, threadChange, threadsChange, type Thread } from '@sand/web-client/contract'
import { collectScope, derive, div, effect, onRaf, untrack } from '@vaakx-dev/vrui'
import { branchLists } from './branches'
import type { ChatContext } from './context'
import { topEdge } from './integrations/top-edge'
import { itemCache } from './cache'
import { branchSwitch } from './rows/branches'
import { pendingRows } from './rows/pending'
import { replyActions } from './rows/reply'
import { rewriteActions } from './rows/rewrite'
import { slotHost } from './slot'
import { shownWait } from './wait'
import { waitLines } from './contract'
import { failed } from './states'
import { foldTurns } from './turns/fold'
import { shownRows, type TurnContext } from './turns/rows'
import { threadColumn, threadView, type ThreadView } from './view'
import { fetchWithin, growStep, resetToEnd, trimAt, windowed } from './window'

const screensKeptAbove = 3
const fewestTrimmed = 20

const blank = (thread: Thread) => !thread.entries.size && !(thread.loaded && thread.live.length)

export const chatController = (ctx: ChatContext, id: string) => {
  const { kit, transcriptParts: parts } = ctx
  const { contextMenu, firstRowBelow, followEnd, jumpButton, keepAnchor, toEnd } = kit
  const cache = itemCache(parts)
  const states = parts.openStates()
  const slot = slotHost()
  const menu = contextMenu()
  const view = threadView(id, branchLists(entry => ctx.threads.branches(id, entry)))
  const edge = topEdge(
    () => reveal(),
    () => trim(),
  )
  const showing = () => untrack(() => view.visible.get())

  const onScroll = () => {
    if (!showing()) return
    follow.scrolled()
    edge.scrolled()
  }
  const scroller = div(
    { 'data-part': 'transcript', class: 'relative z-0 min-h-0 flex-1 overflow-auto overscroll-contain', onScroll },
    kit.topFade(),
    edge.sentinel,
    slot.node,
    threadColumn(kit, view, node => follow.watch(node)),
  )
  const follow = followEnd(scroller)
  edge.watch(scroller)

  const hideThread = () => {
    view.visible.set(false)
    follow.away.set(false)
  }

  const showSlot = (key: string, build: () => HTMLElement) => {
    hideThread()
    slot.show(key, build)
  }

  const quote = parts.quoteJump(scroller)
  const jump = (from: Element, text: string) => quote(view.rowList, from, text)

  const shownThread = () => {
    const thread = ctx.threads.get(id)
    return thread && showing() ? thread : undefined
  }

  const repaint = () => {
    const thread = shownThread()
    if (thread) paint(thread, view)
  }

  const paint = (thread: Thread, view: ThreadView, grow = 0) => {
    const rows = parts.rows({
      conversation: thread.id,
      cwd: thread.info.cwd,
      menu,
      states,
      jump,
      reply: text => replyActions(ctx, text),
      rewrite: (entry, text) => rewriteActions(ctx, thread.id, entry, text),
      branchSwitch: entry => branchSwitch(ctx, view, entry),
    })
    const context: TurnContext = { kit, rows, states, repaint, wait: shownWait(ctx.get(waitLines), thread) }
    const items = cache.items(thread, () => ctx.threads.path(thread.id))
    const folded = foldTurns(items, {
      older: ctx.threads.older(thread.id),
      running: thread.turn,
      waiting: thread.waiting !== undefined,
      streaming: thread.live.length > 0,
      started: thread.started,
      open: key => untrack(() => states.get(key).open.get()),
    })
    const drawn = windowed(view, folded, grow).flatMap(entry => shownRows(entry, context).map(row => ({ row, entry: entry.key })))
    view.rowEntries = drawn.map(({ entry }) => entry)
    view.more.set(view.above > 0 || ctx.threads.older(thread.id))
    view.branches.follow(thread)
    view.rows.set([...drawn.map(({ row }) => row), ...pendingRows(ctx, thread, rows, untrack(() => ctx.get(composer)?.sending()))])
  }

  const reveal = () => {
    const thread = shownThread()
    if (!thread || !scroller.clientHeight) return false
    if (view.above < fetchWithin && ctx.threads.older(id)) void ctx.threads.page(id)
    if (!view.above) return false
    keepAnchor(scroller, view.rowList, () => paint(thread, view, growStep))
    return true
  }

  const trim = () => {
    const thread = shownThread()
    if (!thread || follow.pinned()) return
    const index = firstRowBelow(view.rowList, scroller.getBoundingClientRect().top - screensKeptAbove * scroller.clientHeight)
    const first = view.rowEntries[index]
    if (index < fewestTrimmed || !first) return
    view.first = first
    keepAnchor(scroller, view.rowList, () => paint(thread, view))
  }

  let queued: (() => void) | undefined

  const unqueue = () => {
    queued?.()
    queued = undefined
  }

  const render = (): void => {
    unqueue()
    const thread = ctx.threads.get(id)
    const problem = thread?.failed
    if (problem && !thread.loaded && !thread.entries.size) return showSlot(`failed:${problem}`, () => failed(kit, problem, () => void ctx.threads.load(id)))
    if (!thread || blank(thread)) {
      hideThread()
      return slot.clear()
    }
    const tail = !showing() || follow.pinned()
    slot.clear()
    view.visible.set(true)
    if (tail && view.size > trimAt) resetToEnd(view)
    if (tail) paint(thread, view)
    else keepAnchor(scroller, view.rowList, () => paint(thread, view))
    if (tail) toEnd(scroller)
    follow.measure()
    edge.pump()
  }

  const root = div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, jumpButton(follow.away, follow.toEnd), menu.view())

  const refresh = () => {
    cache.reset()
    queued ??= collectScope(() => onRaf(render)).value
  }

  let stop: (() => void) | undefined

  const show = () => {
    if (stop) return
    follow.restore()
    stop = joinDisposers(
      ctx.threads.watch(id),
      ctx.on(threadChange, changed => {
        if (changed === id) render()
      }),
      ctx.on(threadsChange, render),
      ctx.on(modelsChange, refresh),
      ctx.watch(composer, found => {
        const sending = derive(() => {
          const message = found?.sending()
          return message?.conversation === id ? message : undefined
        })
        return effect(() => {
          sending.get()
          untrack(render)
        })
      }),
      effect(() => {
        parts.version.get()
        untrack(refresh)
      }),
    )
    render()
  }

  const hide = () => {
    stop?.()
    stop = undefined
    unqueue()
  }

  return { node: root, show, hide, prepare: render }
}

export type ChatView = ReturnType<typeof chatController>
