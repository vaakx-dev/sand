import { botColors, type Bot, type BotColor, type BotPatch } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, section, sig, type Sig } from '@vaakx-dev/vrui'
import { avatar } from '../avatar'

export type Draft = { [K in keyof Pick<Bot, 'name' | 'job'>]: Sig<Bot[K]> }

export interface Identity {
  id: string
  draft: Draft
  color(): BotColor
  pick(color: BotColor): void
  save(patch: BotPatch): void
}

const colorNames: Record<BotColor, string> = { gold: 'Gold', sky: 'Sky', orange: 'Orange', green: 'Green', red: 'Red', grey: 'Grey' }

export const draftOf = ({ name, job }: Pick<Bot, 'name' | 'job'>): Draft => ({ name: sig(name), job: sig(job) })

const swatch = (kit: Kit, { id, color, pick }: Identity, choice: BotColor) => {
  const chosen = () => color() === choice
  return kit.plainButton(
    {
      role: 'radio',
      title: colorNames[choice],
      'aria-label': colorNames[choice],
      'aria-checked': () => String(chosen()),
      class: ['rounded-md', () => (chosen() ? 'ring-2 ring-accent-500' : null)],
      onClick: () => pick(choice),
    },
    avatar(() => ({ id, color: choice }), 24),
  )
}

const colorChoice = (kit: Kit, identity: Identity) =>
  div({ class: 'flex flex-wrap gap-2', role: 'radiogroup', 'aria-label': 'Colour' }, ...botColors.map(choice => swatch(kit, identity, choice)))

export const identityFields = (kit: Kit, identity: Identity) => {
  const { sectionHeading, settingsRow, settingsSection, textArea, textInput } = kit
  const { draft, save } = identity
  const saveName = () => {
    const name = draft.name.get().trim()
    if (name) save({ name })
  }
  return [
    settingsSection(
      {},
      settingsRow({ title: 'Name' }, textInput({ bindValue: draft.name, maxLength: 60, class: 'w-48', onChange: saveName })),
      settingsRow({ title: 'Colour' }, colorChoice(kit, identity)),
    ),
    section(
      { class: 'flex flex-col gap-2', 'aria-label': 'Job' },
      div({ class: 'px-2' }, sectionHeading('Job')),
      textArea({
        bindValue: draft.job,
        rows: 10,
        maxLength: 20_000,
        placeholder: 'What this bot does and how',
        'aria-label': 'Job',
        onChange: () => save({ job: draft.job.get() }),
      }),
    ),
  ]
}
