import { approvalViews } from '@sand/approvals/contract'
import type { Row } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, effect, list, onMount, show, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import type { WorkContext } from '../context'
import { threadSource, type ThreadSource } from './source'

export interface ThreadActions {
  back(): void
  backLabel: string
}

const column = 'mx-auto w-full max-w-3xl'

const olderEdge = 240

const waitingText = 'Waiting for you'

const keepPlace = async (scroller: HTMLElement, rowList: HTMLElement, load: () => Promise<void>) => {
  const anchor = rowList.firstElementChild
  const top = scroller.scrollTop
  const before = anchor instanceof HTMLElement ? anchor.offsetTop : 0
  await load()
  if (anchor instanceof HTMLElement) scroller.scrollTop = top + anchor.offsetTop - before
}

const head = (ctx: WorkContext, source: ThreadSource, { back, backLabel }: ThreadActions) => {
  const { headTitle, icon, iconButton, paneHead, plainButton } = ctx.kit
  return paneHead(
    { led: true },
    plainButton(
      {
        title: `Back to ${backLabel}`,
        'aria-label': `Back to ${backLabel}`,
        class: 'flex h-8 min-w-0 max-w-32 shrink-0 items-center gap-1 rounded-md pr-2 text-sm text-neutral-400 hover:text-neutral-100',
        onClick: back,
      },
      icon('left', 'md'),
      span({ class: 'truncate' }, backLabel),
    ),
    headTitle(2, () => source.title.get()),
    iconButton({ title: 'Open in Threads', 'aria-label': 'Open in Threads', onClick: () => void ctx.threads.select(source.id) }, icon('external', 'md')),
  )
}

const statusView = (kit: Kit, source: ThreadSource) => {
  const line = source.read(thread => {
    if (!thread?.running) return undefined
    if (thread.waiting) return { waiting: true, text: waitingText }
    if (thread.live.at(-1)?.type === 'text') return undefined
    return { waiting: false, text: thread.step ? `Using ${thread.step.name}` : 'Working' }
  })
  const text = () => line.get()?.text ?? ''
  const waiting = derive(() => line.get()?.waiting)
  return dynamicChild(waiting, shown => {
    if (shown === undefined) return null
    const mark = shown ? kit.dot('accent') : kit.spinner('sm')
    return div({ class: 'mb-3' }, kit.statusLine({ mark, text, title: text }))
  })
}

const stateView = (kit: Kit, source: ThreadSource) =>
  dynamicChild(source.state, shown => {
    if (shown === 'loading') return div({ class: [column, 'px-4 py-4'] }, kit.loadingState())
    if (shown === 'failed') return div({ class: [column, 'px-4 py-4'] }, kit.errorState({ text: () => source.failure.get() ?? '', retry: source.retry }))
    if (shown === 'empty') return div({ class: [column, 'px-4 py-12 text-center text-sm text-neutral-500'] }, 'Nothing in this thread yet.')
    return null
  })

export const threadView = (ctx: WorkContext, thread: string, actions: ThreadActions): HTMLElement => {
  const { kit, transcriptParts: parts } = ctx
  const source = threadSource(ctx, thread)
  const menu = kit.contextMenu()
  const rowList = div({ class: 'pb-6' })
  const quote = parts.quoteJump(rowList)
  const rows = source.rowsOf({ menu, states: parts.openStates(), jump: (from, text) => quote(rowList, from, text) })
  const paging = sig(false)
  const jumpShown = sig(false)
  let pinned = true
  let lastTop = 0

  const older = () => {
    if (paging.get() || !source.older()) return
    paging.set(true)
    void keepPlace(scroller, rowList, source.page)
      .catch(error => ctx.report(error))
      .finally(() => paging.set(false))
  }

  const onScroll = () => {
    const top = scroller.scrollTop
    if (kit.nearEnd(scroller)) pinned = true
    else if (top < lastTop) pinned = false
    lastTop = top
    jumpShown.set(!pinned)
    if (top < olderEdge) older()
  }

  const watched = (node: HTMLElement) => {
    onMount(node, () => watchRow(node))
    return node
  }

  const rowNode = (row: Sig<Row>) => watched(untrack(() => row.get()).view(row.map(value => value.data)))

  const scroller: HTMLElement = div(
    { class: 'relative z-0 min-h-0 flex-1 overflow-auto overscroll-contain', onScroll },
    div(
      { class: 'flex min-h-full flex-col' },
      show(paging, () => div({ class: 'flex justify-center py-2 text-neutral-500' }, kit.spinner('sm'))),
      stateView(kit, source),
      div(
        { class: [column, 'flex flex-col px-3 pt-4'], hidden: () => source.state.get() !== 'rows' },
        list(rows, row => row.key, rowNode, rowList),
        watched(div(statusView(kit, source))),
      ),
      kit.dockFade(),
    ),
  )
  const watchRow = kit.rowSizes(scroller, () => pinned)

  const toLatest = () => {
    kit.toEnd(scroller)
    pinned = true
    jumpShown.set(false)
  }

  const dock = ctx.composer.dock({
    running: () => source.running.get(),
    path: () => ctx.threads.path(thread),
    send: prompt => ctx.turns.send(thread, prompt),
    interrupt: () => ctx.turns.interrupt(thread).then(() => undefined),
  })
  const approvals = ctx.get(approvalViews)?.banner('thread', thread)
  if (approvals) effect(() => (approvals.asking() ? dock.slot('banner', approvals.view) : undefined))

  return div(
    { class: 'flex h-full min-h-0 min-w-0 flex-1 flex-col', onMount: source.listen },
    head(ctx, source, actions),
    div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, kit.jumpButton(jumpShown, toLatest), menu.view()),
    dock.view,
  )
}
