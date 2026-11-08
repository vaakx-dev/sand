import { botPatch, type BotPatch, type BotSummary, type Computer, type ModelPolicy } from '@sand/bots/contract'
import { pcs } from '@sand/devices-contract'
import { modelPicker, type PickerTarget } from '@sand/model-picker/contract'
import type { Choice } from '@sand/ui-kit/contract'
import { dollars } from '@sand/util'
import { div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import { applyChoice, effective } from '../models'
import type { Parts } from '../parts'

type Bot = () => BotSummary | undefined

type Tier = keyof ModelPolicy

const tiers: { tier: Tier; title: string; detail: string }[] = [
  { tier: 'main', title: 'Main model', detail: 'Its chat and the work it does itself' },
  { tier: 'quick', title: 'Quick model', detail: 'Small jobs, like summaries and titles' },
]

const plainChoice = (parts: Parts, bot: BotSummary | undefined, tier: Tier) => {
  const { model, effort } = effective(bot?.models[tier] ?? {}, parts.defaults.get())
  return [model ?? 'Default model', effort].filter(Boolean).join(' · ')
}

const modelRow = (parts: Parts, bot: Bot, save: (patch: BotPatch) => void, { tier, title, detail }: (typeof tiers)[number]) => {
  const { kit } = parts.ctx
  const picker = parts.ctx.get(modelPicker)
  const target = (found: NonNullable<typeof picker>): PickerTarget => ({
    shown: () => {
      const models = bot()?.models
      return models && found.resolve(effective(models[tier], parts.defaults.get()))
    },
    set: patch => {
      const models = bot()?.models
      if (models) save({ models: { ...models, [tier]: applyChoice(models[tier], patch) } })
    },
  })
  return kit.settingsRow({ title, detail }, picker ? picker.button(target(picker), title) : kit.metaLine(() => plainChoice(parts, bot(), tier)))
}

const computerChoices = (parts: Parts): Choice<Computer>[] => [
  { value: 'none', label: 'None' },
  { value: 'own', label: 'Browser', title: 'The browser sand controls' },
  { value: 'this-pc', label: 'This PC', title: "The screen, mouse and keyboard of the PC sand runs on" },
  ...(parts.ctx.get(pcs)?.list() ?? []).filter(pc => !pc.home).map(pc => ({ value: `pc:${pc.id}` as const, label: pc.name, title: `${pc.name}'s screen, mouse and keyboard` })),
]

const computerRow = (parts: Parts, bot: Bot, save: (patch: BotPatch) => void) => {
  const { kit } = parts.ctx
  return kit.settingsRow(
    { title: 'Computer', detail: 'What its computer tools use when it names none' },
    kit.segmented(computerChoices(parts), () => bot()?.computer, computer => save({ computer }), { label: 'Computer' }),
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
    if (budget !== (bot()?.budget ?? null) && botPatch.safeParse({ budget }).success) save({ budget })
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
  const save = (patch: BotPatch) => void parts.store.update(id, patch).catch(error => parts.ctx.report(error))
  return dynamicChild(parts.advanced, on =>
    on
      ? parts.ctx.kit.pageSection(
          { title: 'Advanced' },
          ...tiers.map(tier => modelRow(parts, bot, save, tier)),
          computerRow(parts, bot, save),
          limitRow(parts, bot, save),
        )
      : null,
  )
}
