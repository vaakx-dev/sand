import type { ConversationItem } from '@sand/pull-detail/contract'
import { derive, div, dynamicChild, keys, list, show, sig, span } from '@vaakx-dev/vrui'
import { threadPrompt } from '../../agent/prompts'
import type { Shown } from '../shown'
import { commentView } from './comment'
import { hunkExcerpt } from './hunk'

export type ReviewThread = Extract<ConversationItem, { kind: 'thread' }>

const placeOf = (thread: ReviewThread) => (thread.line ? `${thread.path}:${thread.line}` : thread.path)

const threadHead = (shown: Shown, thread: () => ReviewThread) => {
  const { kit } = shown.parts
  return div(
    { class: 'flex min-w-0 items-center gap-2 border-b border-neutral-800 px-3 py-2 text-xs' },
    span({ class: 'min-w-0 flex-1 truncate font-mono text-neutral-400', title: () => placeOf(thread()) }, () => placeOf(thread())),
    show(
      () => thread().outdated,
      () => kit.badge('neutral', 'outdated'),
    ),
    dynamicChild(
      () => thread().resolved,
      resolved => (resolved ? kit.badge('success', 'resolved') : kit.badge('warning', 'open')),
    ),
  )
}

const askButton = (shown: Shown, thread: () => ReviewThread) => {
  const { kit, agent } = shown.parts
  return dynamicChild(
    () => shown.linked.get()[0],
    linked =>
      linked
        ? kit.secondaryAction(
            { size: 'sm', title: 'Send this conversation to the pull request’s thread', onClick: () => void agent.ask(linked, threadPrompt(shown.pull(), thread())) },
            kit.icon('sparkles', 12),
            'Ask agent',
          )
        : agent.canOpen(shown.pull())
          ? kit.secondaryAction({ size: 'sm', title: 'Open a thread for this pull request first', onClick: () => void agent.open(shown.pull()) }, kit.icon('worktree', 12), 'Open in a thread')
          : null,
  )
}

const threadFoot = (shown: Shown, thread: () => ReviewThread) => {
  const { kit } = shown.parts
  const draft = sig('')
  const sending = sig(false)
  const send = async () => {
    const body = draft.get().trim()
    if (!body || sending.get()) return
    sending.set(true)
    const sent = await shown.actions.reply(body, thread().id)
    sending.set(false)
    if (sent) draft.set('')
  }
  return div(
    { class: 'flex flex-wrap items-center gap-2 border-t border-neutral-800 p-2' },
    div(
      { class: 'flex min-w-40 flex-1' },
      kit.textInput({ bindValue: draft, placeholder: 'Reply', 'aria-label': 'Reply', disabled: sending, onKeyDown: keys({ Enter: () => void send() }) }),
    ),
    kit.secondaryAction(
      { size: 'sm', disabled: shown.model.busy, onClick: () => void shown.actions.resolve(thread().id, !thread().resolved) },
      () => (thread().resolved ? 'Unresolve' : 'Resolve'),
    ),
    askButton(shown, thread),
  )
}

export const threadCard = (shown: Shown, thread: () => ReviewThread) => {
  const { kit } = shown.parts
  return div(
    { class: 'flex flex-col overflow-hidden rounded-md border border-neutral-800' },
    threadHead(shown, thread),
    dynamicChild(
      () => thread().hunk,
      hunk => hunkExcerpt(kit, hunk),
    ),
    list(
      derive(() => thread().comments),
      comment => comment.id,
      comment => commentView(shown.parts, () => comment.get()),
      div({ class: 'flex flex-col gap-3 px-3 py-2' }),
    ),
    threadFoot(shown, thread),
  )
}
