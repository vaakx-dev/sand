import type { JobEntry } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span } from '@vaakx-dev/vrui'
import type { BotStore } from '../store'

export interface JobParts {
  store: BotStore
  edit(bot: string): void
  report(error: unknown): void
}

export const jobNote = (kit: Kit, { store, edit, report }: JobParts, bot: string, { job, previous }: JobEntry) => {
  const current = () => store.find(bot)?.job
  const restore = () => void store.update(bot, { job: previous }).catch(report)
  return div(
    { class: 'my-3 flex flex-col gap-1' },
    div(
      { class: 'flex items-center gap-2 text-neutral-400' },
      kit.icon('bot', 'sm'),
      kit.metaLine(previous.trim() ? 'Changed its job' : 'Wrote its job'),
      span({ class: 'flex-1' }),
      show(
        () => current() === previous,
        () => kit.metaLine('Undone'),
      ),
      kit.linkButton({ class: 'text-xs', onClick: () => edit(bot) }, 'Edit'),
      show(
        () => current() === job,
        () => kit.linkButton({ class: 'text-xs', onClick: restore }, 'Undo'),
      ),
    ),
    div({ class: 'whitespace-pre-wrap wrap-anywhere' }, kit.secondaryText(job)),
  )
}
