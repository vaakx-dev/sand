import type { BotSummary } from '@sand/bots/contract'
import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, effect, list, onRaf, p, show, span, untrack, type Derive } from '@vaakx-dev/vrui'
import { avatar } from '../avatar'
import { column, pane, paneHead, scrollArea, type HeadParts } from '../pane'
import { composer } from './composer'
import type { Conversation } from './conversation'
import { lineView } from './entry'
import { liveView } from './live'

export interface ChatParts extends HeadParts {
  bot: () => BotSummary
  talk: Conversation
  markdown: Derive<Markdown | undefined>
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
        span({ class: 'truncate' }, () => bot().name),
      ),
    ),
  )
}

const emptyChat = ({ secondaryAction, setupHeading, setupScreen }: Kit, { bot, profile }: ChatParts) =>
  div(
    { class: 'flex flex-1 flex-col items-center justify-center px-4 py-12 text-center' },
    setupScreen(
      avatar(bot, 64),
      setupHeading(() => bot().name),
      dynamicChild(
        derive(() => Boolean(bot().job.trim())),
        hasJob => (hasJob ? p({ class: 'text-sm text-neutral-500' }, 'Send a message to start.') : secondaryAction({ size: 'sm', onClick: profile }, 'Give it a job')),
      ),
    ),
  )

const waiting = (kit: Kit, talk: Conversation, state: 'loading' | 'failed') =>
  state === 'loading' ? kit.loadingState() : kit.errorState({ text: () => talk.failure.get() ?? '', retry: talk.retry })

const working = ({ bot }: ChatParts) => {
  const { status } = bot()
  return status === 'working' || status === 'waiting'
}

const transcript = (kit: Kit, parts: ChatParts) => {
  const { talk, markdown } = parts
  const state = () => {
    if (talk.entries.get() === undefined) return talk.failure.get() ? 'failed' : 'loading'
    return talk.lines.get().length || talk.live.get().length || working(parts) ? 'lines' : 'empty'
  }
  return dynamicChild(
    derive(state),
    shown => {
      if (shown === 'loading' || shown === 'failed') return div({ class: [column, 'px-4 py-4'] }, waiting(kit, talk, shown))
      if (shown === 'empty') return emptyChat(kit, parts)
      return div(
        { class: [column, 'flex flex-col px-4 pt-4 pb-6'] },
        list(
          talk.lines,
          line => line.id,
          line => lineView(kit, line.get(), markdown),
          div({ class: 'contents' }),
        ),
        liveView(kit, talk, markdown, () => parts.bot().status),
      )
    },
  )
}

const keepPlace = async (scroller: HTMLElement, load: () => Promise<void>) => {
  const anchor = scroller.querySelector('[data-line]') ?? undefined
  const top = scroller.scrollTop
  const before = anchor instanceof HTMLElement ? anchor.offsetTop : 0
  await load()
  if (anchor instanceof HTMLElement) scroller.scrollTop = top + anchor.offsetTop - before
}

export const chatView = (kit: Kit, parts: ChatParts) => {
  const { talk } = parts
  let pinned = true
  const scroller: HTMLElement = scrollArea(
    kit,
    {
      onScroll: () => {
        pinned = kit.nearEnd(scroller)
        if (scroller.scrollTop < olderEdge) void keepPlace(scroller, talk.older)
      },
    },
    show(() => talk.loading.get() && talk.more.get(), () => div({ class: 'flex justify-center py-2 text-neutral-500' }, kit.spinner('sm'))),
    transcript(kit, parts),
  )
  effect(() => {
    talk.lines.get()
    talk.live.get()
    untrack(() => {
      if (pinned) onRaf(() => kit.toEnd(scroller), scroller)
    })
  })
  return pane(
    { onMount: () => talk.stop },
    chatHead(kit, parts),
    scroller,
    parts.approvals ? div({ class: 'shrink-0 px-3 md:px-4' }, div({ class: column }, parts.approvals)) : null,
    composer(kit, { name: () => parts.bot().name, working: () => working(parts), send: talk.send, interrupt: talk.interrupt }),
  )
}
