import type { BotPatch, ChangeEntry, Changer } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dollars } from '@sand/util'
import { div, show, span } from '@vaakx-dev/vrui'
import type { BotStore } from '../store'

export interface ChangeParts {
  store: BotStore
  edit(bot: string): void
  report(error: unknown): void
}

const whoOf = (by: Changer) => {
  switch (by.kind) {
    case 'user':
      return 'You'
    case 'agent':
      return 'An agent'
    case 'bot':
      return by.label
    case 'thread':
      return `The agent in “${by.label}”`
  }
}

const limitOf = (budget: number | null | undefined) => (budget == null ? 'no limit' : `${dollars(budget)} a month`)

const settingPhrases = ({ before, after }: Pick<ChangeEntry, 'before' | 'after'>) =>
  [
    after.name !== undefined && `renamed it ${after.name}`,
    after.initial !== undefined && `changed its initial to ${after.initial}`,
    after.color !== undefined && 'changed its colour',
    after.models !== undefined && `set its model to ${after.models.main.model ?? 'the default'}`,
    after.computer !== undefined && 'changed its computer',
    after.projects !== undefined && 'changed its projects',
    after.paused !== undefined && (after.paused ? 'paused it' : 'resumed it'),
    after.budget !== undefined && `changed its limit from ${limitOf(before.budget)} to ${limitOf(after.budget)}`,
  ].filter(phrase => phrase !== false)

const jobPhrase = (before: BotPatch) => (before.job?.trim() ? 'changed its job' : 'wrote its job')

const sentence = (phrases: string[]) => (phrases.length < 2 ? phrases.join('') : `${phrases.slice(0, -1).join(', ')} and ${phrases.at(-1)}`)

const jobBlock = (kit: Kit, { store, edit, report }: ChangeParts, bot: string, job: string, previous: string) => {
  const current = () => store.find(bot)?.job
  const restore = () => void store.update(bot, { job: previous }).catch(report)
  return div(
    { class: 'flex flex-col gap-1' },
    div(
      { class: 'flex items-center gap-2' },
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

export const changeNote = (kit: Kit, parts: ChangeParts, bot: string, { by, before, after }: ChangeEntry) => {
  const phrases = [...(after.job !== undefined ? [jobPhrase(before)] : []), ...settingPhrases({ before, after })]
  return div(
    { class: 'my-3 flex flex-col gap-1' },
    div({ class: 'flex items-center gap-2 text-neutral-400' }, kit.icon('bot', 'sm'), kit.metaLine(`${whoOf(by)} ${sentence(phrases)}`)),
    after.job !== undefined ? jobBlock(kit, parts, bot, after.job, before.job ?? '') : null,
  )
}
