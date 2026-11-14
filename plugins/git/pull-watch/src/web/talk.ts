import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { clip } from '@sand/util'
import { derive, div, dynamicChild, list, span, type Child, type Sig } from '@vaakx-dev/vrui'
import type { PullTalk, Remark, ReviewThread, Said } from '../contract'
import type { Item } from './rows'

export type Loaded = { talk: PullTalk } | { error: string }

export interface TalkParts {
  kit: Kit
  markdown: Markdown
  items(): Item[]
  talk(item: Item): Loaded | undefined
  follow(item: Item): Promise<unknown>
  unfollow(item: Item): Promise<unknown>
  quote(text: string): void
}

const QUOTE_MOST = 1_000

const placeOf = ({ path, line }: ReviewThread) => (line ? `${path}:${line}` : path)

const threadQuote = (talk: PullTalk, thread: ReviewThread) =>
  [`PR #${talk.number} review on ${placeOf(thread)}`, ...thread.remarks.map(remark => `${remark.author}: ${remark.body}`)].join('\n')

const saidQuote = (talk: PullTalk, said: Said) => `PR #${talk.number}, ${said.author} ${said.verdict ?? 'commented'}:\n${said.body}`

const addButton = (parts: TalkParts, text: string) =>
  parts.kit.secondaryAction({ size: 'sm', title: 'Add to the chat as a quote', onClick: () => parts.quote(clip(text, QUOTE_MOST)) }, parts.kit.icon('reply', 'xs'), 'Add to chat')

const card = (parts: TalkParts, head: Child[], body: Child, quote: string) =>
  div(
    { class: 'flex min-w-0 flex-col gap-2 border-l border-neutral-700 pl-3' },
    div({ class: 'flex min-w-0 items-center gap-2 text-xs text-neutral-400' }, ...head, span({ class: 'flex-1' }), addButton(parts, quote)),
    body,
  )

const written = (parts: TalkParts, remark: Remark) => div({ class: 'min-w-0 text-sm wrap-anywhere' }, ...parts.markdown.nodes(remark.body, { size: 'compact' }))

const author = (name: string) => span({ class: 'shrink-0 font-medium text-neutral-100' }, name)

const threadView = (parts: TalkParts, talk: PullTalk, thread: ReviewThread) =>
  card(
    parts,
    [parts.kit.monoMeta(placeOf(thread)), thread.outdated ? span({ class: 'shrink-0' }, 'outdated') : null],
    div(
      { class: 'flex min-w-0 flex-col gap-3' },
      ...thread.remarks.map(remark => div({ class: 'flex min-w-0 flex-col gap-1' }, div({ class: 'text-xs' }, author(remark.author)), written(parts, remark))),
    ),
    threadQuote(talk, thread),
  )

const saidView = (parts: TalkParts, talk: PullTalk, said: Said) =>
  card(
    parts,
    [author(said.author), span({ class: said.verdict === 'requested changes' ? parts.kit.toneText.danger : '' }, said.verdict ?? 'commented')],
    said.body ? written(parts, said) : null,
    saidQuote(talk, said),
  )

const listed = (parts: TalkParts, title: string, views: HTMLElement[], empty: string) =>
  parts.kit.pageSection({ title }, views.length ? div({ class: 'flex min-w-0 flex-col gap-2' }, ...views) : parts.kit.metaLine(empty))

const talkView = (parts: TalkParts, talk: PullTalk) =>
  div(
    { class: 'flex min-w-0 flex-col gap-5' },
    listed(
      parts,
      'Review comments',
      talk.threads.map(thread => threadView(parts, talk, thread)),
      'No review comments.',
    ),
    listed(
      parts,
      'Conversation',
      talk.conversation.map(said => saidView(parts, talk, said)),
      'No comments.',
    ),
  )

const loadedView = (parts: TalkParts, loaded: Loaded | undefined) => {
  if (!loaded) return parts.kit.loadingState()
  if ('error' in loaded) return parts.kit.errorText(loaded.error)
  return talkView(parts, loaded.talk)
}

const followRow = (parts: TalkParts, item: Sig<Item>) =>
  parts.kit.settingsRow(
    { title: 'Keep up with it', detail: 'Wakes this thread when CI finishes, a review or comment lands, or it merges or conflicts' },
    parts.kit.toggleSwitch({
      on: () => item.get().following,
      'aria-label': 'Follow this pull request',
      onClick: () => (item.get().following ? parts.unfollow(item.get()) : parts.follow(item.get())),
    }),
  )

const pullView = (parts: TalkParts, item: Sig<Item>) =>
  div(
    { class: 'flex min-w-0 flex-col gap-4' },
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      span({ class: 'shrink-0' }, parts.kit.monoMeta(() => `#${item.get().number}`)),
      parts.kit.rowTitle(() => item.get().title),
      span({ class: 'flex-1' }),
      parts.kit.iconButton({ title: 'Open on GitHub', 'aria-label': 'Open on GitHub', onClick: () => parts.kit.openTab(item.get().url) }, parts.kit.icon('external', 'sm')),
    ),
    followRow(parts, item),
    dynamicChild(
      () => parts.talk(item.get()),
      loaded => loadedView(parts, loaded),
    ),
  )

export const talkPanel = (parts: TalkParts) =>
  list(
    derive(parts.items),
    item => item.url,
    item => pullView(parts, item),
    div({ class: 'flex min-w-0 flex-col gap-8 p-4' }),
  )
