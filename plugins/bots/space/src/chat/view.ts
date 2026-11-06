import type { ApprovalBanner } from '@sand/approvals/contract'
import { botName, type BotChatPart, type BotSummary } from '@sand/bots/contract'
import type { Composer } from '@sand/composer/contract'
import type { Row, TranscriptParts } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, effect, list, onMount, p, show, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { avatar } from '../avatar'
import { column, pane, paneHead, type HeadParts } from '../pane'
import type { Conversation } from './conversation'
import { aboveDock, beside } from './parts'
import { statusView } from './status'
import { transcriptRows } from './transcript'

export interface ChatParts extends HeadParts {
  bot: () => BotSummary
  talk: Conversation
  transcript: TranscriptParts
  composer: Composer
  approvals?: ApprovalBanner
  parts: Sig<BotChatPart[]>
  profile(): void
}

const olderEdge = 240

const chatHead = (kit: Kit, parts: ChatParts) => {
  const { bot, profile } = parts
  return paneHead(
    kit,
    parts,
    kit.headTitle(
      1,
      kit.plainButton(
        { title: 'Profile', class: 'flex min-w-0 max-w-full items-center gap-2 rounded-md', onClick: profile },
        avatar(bot, 32),
        span({ class: 'truncate' }, () => botName(bot())),
      ),
    ),
  )
}

const emptyChat = ({ setupHeading, setupScreen }: Kit, { bot }: ChatParts) =>
  div(
    { class: 'flex flex-1 flex-col items-center justify-center px-4 py-12 text-center' },
    setupScreen(
      avatar(bot, 64),
      setupHeading(() => botName(bot())),
      p({ class: 'text-sm text-neutral-500' }, () => (bot().job.trim() ? 'Send a message to start.' : "Tell it what you'd like it to take care of.")),
    ),
  )

const waiting = (kit: Kit, talk: Conversation, state: 'loading' | 'failed') =>
  state === 'loading' ? kit.loadingState() : kit.errorState({ text: () => talk.failure.get() ?? '', retry: talk.retry })

const working = ({ bot }: ChatParts) => {
  const { status } = bot()
  return status === 'working' || status === 'waiting'
}

const keepPlace = async (scroller: HTMLElement, rowList: HTMLElement, load: () => Promise<void>) => {
  const anchor = rowList.firstElementChild
  const top = scroller.scrollTop
  const before = anchor instanceof HTMLElement ? anchor.offsetTop : 0
  await load()
  if (anchor instanceof HTMLElement) scroller.scrollTop = top + anchor.offsetTop - before
}

export const chatView = (kit: Kit, parts: ChatParts) => {
  const { talk, transcript } = parts
  const menu = kit.contextMenu()
  const rowList = div({ class: 'pb-6' })
  const quote = transcript.quoteJump(rowList)
  const surface = { conversation: talk.bot, menu, states: transcript.openStates(), jump: (from: Element, text: string) => quote(rowList, from, text) }
  const rows = transcriptRows(kit, transcript, transcript.rows(surface), talk, () => working(parts))
  const state = derive(() => {
    if (talk.entries.get() === undefined) return talk.failure.get() ? 'failed' : 'loading'
    return rows.get().length || working(parts) ? 'rows' : 'empty'
  })
  const jumpShown = sig(false)
  let pinned = true
  let lastTop = 0

  const onScroll = () => {
    const top = scroller.scrollTop
    if (kit.nearEnd(scroller)) pinned = true
    else if (top < lastTop) pinned = false
    lastTop = top
    jumpShown.set(!pinned)
    if (scroller.scrollTop < olderEdge) void keepPlace(scroller, rowList, talk.older)
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
      show(
        () => talk.loading.get() && talk.more.get(),
        () => div({ class: 'flex justify-center py-2 text-neutral-500' }, kit.spinner('sm')),
      ),
      dynamicChild(state, shown => {
        if (shown === 'loading' || shown === 'failed') return div({ class: [column, 'px-3 py-4 md:px-4'] }, waiting(kit, talk, shown))
        return shown === 'empty' ? emptyChat(kit, parts) : null
      }),
      div(
        { class: [column, 'flex flex-col px-3 pt-4 md:px-4'], hidden: () => state.get() !== 'rows' },
        list(rows, row => row.key, rowNode, rowList),
        watched(div(statusView(kit, talk, () => parts.bot().status))),
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

  const dock = parts.composer.dock({
    running: () => working(parts),
    path: () => talk.path.get(),
    send: talk.send,
    interrupt: talk.interrupt,
  })
  const { approvals } = parts
  if (approvals) effect(() => (approvals.asking() ? dock.slot('banner', approvals.view) : undefined))

  const id = untrack(() => parts.bot().id)
  aboveDock(parts.parts, id, dock)
  const chat = pane(
    { onMount: () => talk.stop },
    chatHead(kit, parts),
    div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, kit.jumpButton(jumpShown, toLatest), menu.view()),
    dock.view,
  )
  return div(
    { class: 'flex h-full min-h-0 min-w-0 flex-1' },
    chat,
    show(
      () => !parts.narrow.get(),
      () => beside(parts.parts, id, div({ class: 'flex h-full min-h-0 shrink-0' })),
    ),
  )
}
