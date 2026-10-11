import type { ModelPicker, PickerTarget } from '@sand/model-picker/contract'
import type { TitlePatch, TitleSettings } from '../contract'
import { dynamicChild, settingsRow, settingsSection, show, toggleSwitch, type Sig } from '@sand/dom'

type Save = (patch: TitlePatch) => void

const textGenTarget = (settings: Sig<TitleSettings | undefined>, picker: ModelPicker, save: Save): PickerTarget => ({
  shown: () => {
    const current = settings.get()
    return current && picker.resolve(current)
  },
  set: ({ model, effort, speed }) => save({ ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }),
})

const autoRow = (settings: Sig<TitleSettings | undefined>, save: Save) =>
  settingsRow(
    'Name new threads',
    toggleSwitch({ on: () => settings.get()?.auto ?? false, 'aria-label': 'Name new threads', onClick: () => save({ auto: !settings.get()?.auto }) }),
    'The text gen model writes a short name from your first message',
  )

const modelRow = (settings: Sig<TitleSettings | undefined>, picker: ModelPicker, save: Save) =>
  settingsRow('Text gen model', picker.button(textGenTarget(settings, picker, save), 'Text gen model'), 'Writes thread names and branch names')

export const titlesSection = (settings: Sig<TitleSettings | undefined>, picker: Sig<ModelPicker | undefined>, save: Save) =>
  show(
    () => settings.get() !== undefined,
    () =>
      settingsSection(
        { title: 'Text generation' },
        autoRow(settings, save),
        dynamicChild(picker, current => current && modelRow(settings, current, save)),
      ),
  )
