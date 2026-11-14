import type { ChangeEntry, Changer } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dollars } from '@sand/util'
import { div } from '@vaakx-dev/vrui'

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

const sentence = (phrases: string[]) => (phrases.length < 2 ? phrases.join('') : `${phrases.slice(0, -1).join(', ')} and ${phrases.at(-1)}`)

export const changeNote = (kit: Kit, { by, before, after }: ChangeEntry) => {
  const phrases = settingPhrases({ before, after })
  if (!phrases.length) return undefined
  return div({ class: 'my-3 flex items-center gap-2 text-neutral-400' }, kit.icon('bot', 'sm'), kit.metaLine(`${whoOf(by)} ${sentence(phrases)}`))
}
