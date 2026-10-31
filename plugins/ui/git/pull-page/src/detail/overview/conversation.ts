import type { ConversationItem, ReviewerState } from '@sand/pull-detail/contract'
import { plural } from '@sand/util'
import { derive, div, list, type Sig, show, sig, span } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'
import { authorLine, commentView } from './comment'
import { richText } from './text'
import { type ReviewThread, threadCard } from './thread'

type Review = Extract<ConversationItem, { kind: 'review' }>

const reviewWords: Record<ReviewerState, string> = {
  approved: 'approved',
  changes: 'requested changes',
  commented: 'reviewed',
  pending: 'started a review',
  dismissed: 'review dismissed',
}

const isBot = (item: ConversationItem) => item.kind !== 'thread' && item.bot

const isEmptyReview = (item: ConversationItem) => item.kind === 'review' && item.state === 'commented' && !item.body.trim()

const isResolved = (item: ConversationItem) => item.kind === 'thread' && item.resolved

const reviewView = (shown: Shown, item: () => Review) =>
  div(
    { class: 'flex min-w-0 flex-col gap-1' },
    authorLine(item, span({ class: 'shrink-0' }, () => reviewWords[item().state])),
    show(
      () => Boolean(item().body.trim()),
      () => richText(shown.parts, item().body),
    ),
  )

const latest =
  <T extends ConversationItem>(item: Sig<ConversationItem>, first: T) =>
  (): T => {
    const now = item.get()
    return now.kind === first.kind && now.id === first.id ? (now as T) : first
  }

const itemView = (shown: Shown, item: Sig<ConversationItem>) => {
  const first = item.get()
  if (first.kind === 'thread') return threadCard(shown, latest<ReviewThread>(item, first))
  if (first.kind === 'review') return reviewView(shown, latest<Review>(item, first))
  return commentView(shown.parts, latest(item, first))
}

const foldLine = (shown: Shown, resolved: () => number, bots: () => number, showResolved: Sig<boolean>, showBots: Sig<boolean>) => {
  const { kit } = shown.parts
  const toggle = (on: Sig<boolean>, count: () => number, noun: string) =>
    show(
      () => count() > 0,
      () => kit.linkButton({ class: 'text-xs', onClick: on.toggle() }, () => `${on.get() ? 'Hide' : 'Show'} ${plural(count(), noun)}`),
    )
  return div(
    { class: 'flex flex-wrap items-center gap-3' },
    toggle(showResolved, resolved, 'resolved conversation'),
    toggle(showBots, bots, 'bot comment'),
  )
}

export const conversationBlock = (shown: Shown) => {
  const showResolved = sig(false)
  const showBots = sig(false)
  const all = derive(() => shown.pull().conversation.filter(item => !isEmptyReview(item)).sort((a, b) => a.at - b.at))
  const visible = derive(() => all.get().filter(item => (showResolved.get() || !isResolved(item)) && (showBots.get() || !isBot(item))))
  const count = (test: (item: ConversationItem) => boolean) => () => all.get().filter(test).length
  return div(
    { class: 'flex flex-col gap-4 border-t border-neutral-800 pt-3' },
    list(
      visible,
      item => `${item.kind}:${item.id}`,
      item => itemView(shown, item),
      div({ class: 'flex flex-col gap-4' }),
    ),
    foldLine(shown, count(isResolved), count(isBot), showResolved, showBots),
  )
}
