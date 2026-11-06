import type { JobEntry } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span } from '@vaakx-dev/vrui'
import type { BotStore } from '../store'

export interface JobParts {
  store: BotStore
  edit(): void
}

export const jobCard = (kit: Kit, { store, edit }: JobParts, bot: string, { job, previous }: JobEntry) => {
  const current = () => store.find(bot)?.job
  return div(
    { class: 'my-3 flex flex-col gap-2 rounded-xl bg-neutral-900 p-3 ring-1 ring-neutral-800' },
    div({ class: 'flex items-center gap-2 text-xs text-neutral-400' }, kit.icon('bot', 'sm'), previous.trim() ? 'Changed its job' : 'Wrote its job'),
    div({ class: 'text-sm whitespace-pre-wrap wrap-anywhere text-neutral-100' }, job),
    div(
      { class: 'flex flex-wrap items-center justify-end gap-2' },
      show(
        () => current() === previous,
        () => span({ class: 'text-xs text-neutral-500' }, 'Undone'),
      ),
      kit.quietButton({ size: 'sm', onClick: edit }, 'Edit'),
      show(
        () => current() === job,
        () => kit.quietButton({ size: 'sm', onClick: () => store.update(bot, { job: previous }) }, 'Undo'),
      ),
    ),
  )
}
