import type { Shelves } from '@sand/attachments/web/contract'
import { botName, type BotSummary } from '@sand/bots/contract'
import type { Row, TranscriptParts } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, effect, list, onRaf, p, show, span, untrack, type Derive, type Sig } from '@vaakx-dev/vrui'
import { avatar } from '../avatar'
import { column, pane, paneHead, scrollArea, type HeadParts } from '../pane'
import { composer } from './composer'
import type { Conversation } from './conversation'
import { statusView } from './status'
import { transcriptRows } from './transcript'

export interface ChatParts extends HeadParts {
  bot: () => BotSummary
  talk: Conversation
  transcript: TranscriptParts
  shelves: Derive<Shelves | undefined>
  approvals?: HTMLElement
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

const rowNode = (row: Sig<Row>) => untrack(() => row.get()).view(row.map(value => value.data))

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
  const rowList = div()
  const quote = transcript.quoteJump(rowList)
  const surface = { conversation: talk.bot, menu, states: transcript.openStates(), jump: (from: Element, text: string) => quote(rowList, from, text) }
  const rows = transcriptRows(kit, transcript, transcript.rows(surface), talk, () => working(parts))
  const state = derive(() => {
    if (talk.entries.get() === undefined) return talk.failure.get() ? 'failed' : 'loading'
    return rows.get().length || working(parts) ? 'rows' : 'empty'
  })
  let pinned = true
  const scroller: HTMLElement = scrollArea(
    kit,
    {
      onScroll: () => {
        pinned = kit.nearEnd(scroller)
        if (scroller.scrollTop < olderEdge) void keepPlace(scroller, rowList, talk.older)
      },
    },
    show(() => talk.loading.get() && talk.more.get(), () => div({ class: 'flex justify-center py-2 text-neutral-500' }, kit.spinner('sm'))),
    dynamicChild(state, shown => {
      if (shown === 'loading' || shown === 'failed') return div({ class: [column, 'px-4 py-4'] }, waiting(kit, talk, shown))
      return shown === 'empty' ? emptyChat(kit, parts) : null
    }),
    div(
      { class: [column, 'flex flex-col px-4 pt-4 pb-6'], hidden: () => state.get() !== 'rows' },
      list(rows, row => row.key, rowNode, rowList),
      statusView(kit, talk, () => parts.bot().status),
    ),
  )
  effect(() => {
    rows.get()
    untrack(() => {
      if (pinned) onRaf(() => kit.toEnd(scroller), scroller)
    })
  })
  return pane(
    { onMount: () => talk.stop },
    chatHead(kit, parts),
    scroller,
    menu.view(),
    parts.approvals ? div({ class: 'shrink-0 px-3 md:px-4' }, div({ class: column }, parts.approvals)) : null,
    composer(kit, { name: () => botName(parts.bot()), working: () => working(parts), shelves: parts.shelves, send: talk.send, interrupt: talk.interrupt }),
  )
}
