import { botPatch, type BotPatch, type BotSummary } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dollars } from '@sand/util'
import { div, sig, span } from '@vaakx-dev/vrui'

const shown = (budget: number | null) => (budget === null ? '' : String(budget))

const limitOf = (text: string) => {
  const value = text.trim().replace(/^\$/, '')
  return value ? Number(value) : null
}

const spentLine = (bot: BotSummary) => {
  const month = new Date().toLocaleDateString('en', { month: 'long' })
  return `${dollars(bot.spent)} spent in ${month} · API use only; plan usage doesn't count`
}

export const holdSection = ({ settingsRow, settingsSection, textInput, toggleSwitch }: Kit, bot: () => BotSummary, save: (patch: BotPatch) => void) => {
  const draft = sig(shown(bot().budget))
  const saveLimit = () => {
    const budget = limitOf(draft.get())
    if (botPatch.safeParse({ budget }).success) save({ budget })
    else draft.set(shown(bot().budget))
  }
  return settingsSection(
    {},
    settingsRow(
      { title: 'Paused', detail: 'Starts no turns; messages wait until you resume it' },
      toggleSwitch({ on: () => bot().paused, 'aria-label': 'Paused', onClick: () => save({ paused: !bot().paused }) }),
    ),
    settingsRow(
      { title: 'Monthly limit', detail: () => spentLine(bot()) },
      div(
        { class: 'flex items-center gap-1 text-sm text-neutral-400' },
        span({}, '$'),
        textInput({ bindValue: draft, inputMode: 'decimal', placeholder: 'No limit', 'aria-label': 'Monthly limit in dollars', class: 'w-24', onChange: saveLimit }),
      ),
    ),
  )
}
