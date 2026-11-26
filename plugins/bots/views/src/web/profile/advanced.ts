import { botPatch, type BotPatch, type BotSummary, type ChosenComputer, type Computer } from '@sand/bots/contract'
import { pcs } from '@sand/devices-contract'
import { dollars } from '@sand/util'
import { div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import type { Parts } from '../parts'

type Bot = () => BotSummary | undefined

interface ComputerChoice {
  value: ChosenComputer
  label: string
}

const UNSET_LABEL = 'This PC, from its first message'

const computerChoices = (parts: Parts): ComputerChoice[] => [
  { value: 'own', label: 'Browser' },
  { value: 'this-pc', label: 'This PC' },
  ...(parts.ctx.get(pcs)?.list() ?? []).filter(pc => !pc.home).map(pc => ({ value: `pc:${pc.id}` as const, label: pc.name })),
]

const computerLabel = (choices: ComputerChoice[], computer: Computer | undefined) => {
  if (computer === 'none') return UNSET_LABEL
  return choices.find(choice => choice.value === computer)?.label ?? 'Unknown PC'
}

const computerRow = (parts: Parts, bot: Bot, save: (patch: BotPatch) => void) => {
  const { kit } = parts.ctx
  const pick = (close: () => void, computer: ChosenComputer) => () => {
    close()
    if (computer !== bot()?.computer) save({ computer })
  }
  return kit.settingsRow(
    { title: 'Computer', detail: 'What its computer tools use when it names none' },
    kit.dropdown({
      placement: 'below-right',
      trigger: press =>
        kit.pickerButton({ ...press, 'aria-label': 'Computer', field: true }, () => computerLabel(computerChoices(parts), bot()?.computer)),
      items: close =>
        computerChoices(parts).map(choice =>
          kit.choiceItem({ selected: () => bot()?.computer === choice.value, onClick: pick(close, choice.value) }, span({ class: 'flex-1 truncate' }, choice.label)),
        ),
    }),
  )
}

const shownLimit = (budget: number | null | undefined) => (budget == null ? '' : String(budget))

const limitOf = (text: string) => {
  const value = text.trim().replace(/^\$/, '')
  return value ? Number(value) : null
}

const spentLine = (bot: BotSummary | undefined) => {
  const month = new Date().toLocaleDateString('en', { month: 'long' })
  return `${dollars(bot?.spent ?? 0)} spent in ${month}. API use only; plan usage doesn't count.`
}

const limitRow = (parts: Parts, bot: Bot, save: (patch: BotPatch) => void) => {
  const { kit } = parts.ctx
  const draft = sig(shownLimit(bot()?.budget))
  const commit = () => {
    const budget = limitOf(draft.get())
    if (budget !== (bot()?.budget ?? null) && botPatch().safeParse({ budget }).success) save({ budget })
    else draft.set(shownLimit(bot()?.budget))
  }
  return kit.settingsRow(
    { title: 'Monthly limit', detail: () => spentLine(bot()) },
    div(
      { class: 'flex items-center gap-1 text-sm text-neutral-400' },
      span({}, '$'),
      kit.textInput({ bindValue: draft, inputMode: 'decimal', placeholder: 'No limit', 'aria-label': 'Monthly limit in dollars', class: 'w-24', onChange: commit }),
    ),
  )
}

export const advancedBlock = (parts: Parts, id: string, bot: Bot) => {
  const save = (patch: BotPatch) => void parts.toasts.attempt('Couldn’t save the bot', () => parts.store.update(id, patch))
  return dynamicChild(parts.advanced, on =>
    on
      ? parts.ctx.kit.pageSection(
          { title: 'Advanced' },
          computerRow(parts, bot, save),
          limitRow(parts, bot, save),
        )
      : null,
  )
}
