import { composer } from '@sand/composer/contract'
import { itemNode, itemSpot, type ItemSpot, type ShownChat } from '@sand/transcript/contract'
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
import { foldTurns, unfolding, type FoldOptions, type Unfold } from './turns/fold'
import { shownRows, type TurnContext } from './turns/rows'
import { threadColumn, threadView, type ThreadView } from './view'
import { fetchWithin, growStep, resetToEnd, trimAt, windowed } from './window'

interface Located {
  spot: ItemSpot
  unfold: Unfold
}

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
  const view = threadView(id, branchLists(() => ctx.threads.forks(id)))
  const edge = topEdge(
    () => grow(),
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

  const root = div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, jumpButton(follow.away, follow.toEnd), menu.view())

  const jump = (from: Element, text: string) => parts.quoteJump(view.rowList, from, text)

  const shownThread = () => {
    const thread = ctx.threads.get(id)
    return thread && showing() ? thread : undefined
  }

  const repaint = () => {
    const thread = shownThread()
    if (thread) paint(thread, view)
  }

  const itemsOf = (thread: Thread) => cache.items(thread, () => ctx.threads.path(thread.id))

  const foldOptions = (thread: Thread): FoldOptions => ({
    older: ctx.threads.older(thread.id),
    running: thread.turn,
    waiting: thread.waiting !== undefined,
    streaming: thread.live.length > 0,
    started: thread.started,
    open: key => untrack(() => states.get(key).open.get()),
  })

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
    const folded = foldTurns(itemsOf(thread), foldOptions(thread))
    const drawn = windowed(view, folded, grow).flatMap(entry => shownRows(entry, context).map(row => ({ row, entry: entry.key })))
    view.rowEntries = drawn.map(({ entry }) => entry)
    view.more.set(view.above > 0 || ctx.threads.older(thread.id))
    view.branches.follow(thread)
    view.rows.set([...drawn.map(({ row }) => row), ...pendingRows(ctx, thread, rows, untrack(() => ctx.get(composer)?.sending()))])
  }

  const grow = () => {
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

  const located = (entry: string, block?: number): Located | undefined => {
    const thread = ctx.threads.get(id)
    const found = ctx.threads.path(id).find(loaded => loaded.id === entry)
    if (!thread || !found) return undefined
    const items = itemsOf(thread)
    const spot = itemSpot(items, found, block)
    return spot && { spot, unfold: unfolding(items, spot.item.key, foldOptions(thread)) }
  }

  const loadedSpot = async (entry: string, block?: number) => {
    for (let size = -1; ; ) {
      const found = located(entry, block)
      if (found && found.unfold.kind !== 'hidden') return found
      const loaded = ctx.threads.path(id).length
      if (loaded === size || !ctx.threads.older(id)) return undefined
      size = loaded
      await ctx.threads.page(id)
    }
  }

  const unfold = ({ spot, unfold }: Located) => {
    const keys = unfold.kind === 'turn' ? [unfold.key, ...spot.folds] : spot.folds
    for (const key of keys) states.get(key).open.set(true)
  }

  const drawItem = (thread: Thread, key: string) =>
    keepAnchor(scroller, view.rowList, () => {
      paint(thread, view)
      if (view.rowEntries.includes(key)) return
      view.first = key
      paint(thread, view, growStep)
    })

  const revealEntry = async (entry: string, block?: number) => {
    const found = await loadedSpot(entry, block)
    const thread = shownThread()
    if (!found || !thread) return undefined
    unfold(found)
    const drawn = itemNode(view.rowList, found.spot.key)
    if (found.unfold.kind === 'shown' && drawn) return drawn
    drawItem(thread, found.spot.item.key)
    return itemNode(view.rowList, found.spot.key)
  }

  const shownChat: ShownChat = {
    owner: 'thread',
    conversation: id,
    frame: root,
    scroller,
    loaded: () => ctx.threads.path(id),
    older: async () => {
      await ctx.threads.page(id)
      return ctx.threads.older(id)
    },
    reveal: revealEntry,
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
      effect(() => (view.visible.get() ? ctx.shownChats.add(shownChat) : undefined)),
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
