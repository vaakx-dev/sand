import type { ModelInfo } from '@sand/llm-accounts/contract'
import type { TitlePatch, TitleSettings } from '../contract'
import { derive, div, dynamicChild, selectMenu, settingsRow, settingsSection, toggleSwitch, type Sig } from '@sand/dom'

const sameAsThread = { value: '', label: 'Same as the thread' }

const choices = (models: ModelInfo[], chosen?: string) => {
  const listed = models.map(model => ({ value: model.id, label: model.label }))
  if (!chosen) return [sameAsThread, ...listed]
  return listed.some(choice => choice.value === chosen) ? listed : [{ value: chosen, label: chosen }, ...listed]
}

const section = ({ auto, model }: TitleSettings, models: ModelInfo[], save: (patch: TitlePatch) => void) =>
  settingsSection(
    { title: 'Thread names' },
    settingsRow(
      'Name new threads',
      toggleSwitch({ on: auto, 'aria-label': 'Name new threads', onClick: () => save({ auto: !auto }) }),
      'A small model writes a short name from your first message',
    ),
    settingsRow(
      'Naming model',
      selectMenu(choices(models, model), model ?? '', id => id && save({ model: id })),
      'Only used for names',
    ),
  )

export const titlesSection = (state: Sig<TitleSettings | undefined>, models: Sig<ModelInfo[]>, save: (patch: TitlePatch) => void) =>
  dynamicChild(
    derive(() => ({ settings: state.get(), models: models.get() })),
    ({ settings, models }) => (settings ? section(settings, models, save) : div({ class: 'hidden' })),
  )
