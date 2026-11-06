import type { BotPatch, BotSummary, ModelChoice, ModelPolicy } from '@sand/bots/contract'
import type { ModelPicker, PickerTarget } from '@sand/model-picker/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, type Derive } from '@vaakx-dev/vrui'

export interface ModelParts {
  bot: () => BotSummary
  picker: Derive<ModelPicker | undefined>
  defaults: Derive<ModelChoice>
  save(patch: BotPatch): void
}

type Tier = keyof ModelPolicy

const tiers: { tier: Tier; title: string }[] = [
  { tier: 'main', title: 'Main model' },
  { tier: 'quick', title: 'Quick model' },
]

type Patch = Parameters<PickerTarget['set']>[0]

const applied = (choice: ModelChoice, { model, effort }: Patch): ModelChoice => {
  const next = { ...choice, ...(model !== undefined && { model }), ...(effort !== undefined && { effort }) }
  return { ...(next.model && { model: next.model }), ...(next.effort && { effort: next.effort }) }
}

const effective = ({ bot, defaults }: ModelParts, tier: Tier): ModelChoice => {
  const { model, effort } = defaults.get()
  return { ...(model && { model }), ...(effort && { effort }), ...bot().models[tier] }
}

const choose = ({ bot, save }: ModelParts, tier: Tier, choice: ModelChoice) => save({ models: { ...bot().models, [tier]: choice } })

const target = (parts: ModelParts, picker: ModelPicker, tier: Tier): PickerTarget => ({
  shown: () => picker.resolve(effective(parts, tier)),
  set: patch => choose(parts, tier, applied(parts.bot().models[tier], patch)),
})

const plainChoice = ({ model, effort }: ModelChoice) => [model ?? 'Default model', effort].filter(Boolean).join(' · ')

const tierRow = ({ metaLine, settingsRow }: Kit, parts: ModelParts, { tier, title }: (typeof tiers)[number]) =>
  settingsRow(
    { title },
    dynamicChild(parts.picker, picker => (picker ? picker.button(target(parts, picker, tier), title) : metaLine(() => plainChoice(effective(parts, tier))))),
  )

export const modelSection = (kit: Kit, parts: ModelParts) => kit.settingsSection({}, ...tiers.map(tier => tierRow(kit, parts, tier)))
