import type { ModelPicker, PickerTarget } from '@sand/model-picker/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { TitlePatch, TitleSettings } from '../contract'
import { dynamicChild, show, type Sig } from '@vaakx-dev/vrui'

type Save = (patch: TitlePatch) => void

const textGenTarget = (settings: Sig<TitleSettings | undefined>, picker: ModelPicker, save: Save): PickerTarget => ({
  shown: () => {
    const current = settings.get()
    return current && picker.resolve(current)
  },
  set: ({ model, effort, speed }) => save({ ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }),
})

const autoRow = ({ settingsRow, toggleSwitch }: Kit, settings: Sig<TitleSettings | undefined>, save: Save) =>
  settingsRow(
    'Name new threads',
    toggleSwitch({ on: () => settings.get()?.auto ?? false, 'aria-label': 'Name new threads', onClick: () => save({ auto: !settings.get()?.auto }) }),
    'The text gen model writes a short name from your first message',
  )

const modelRow = ({ settingsRow }: Kit, settings: Sig<TitleSettings | undefined>, picker: ModelPicker, save: Save) =>
  settingsRow('Text gen model', picker.button(textGenTarget(settings, picker, save), 'Text gen model'), 'Writes thread names and branch names')

export const titlesSection = (kit: Kit, settings: Sig<TitleSettings | undefined>, picker: Sig<ModelPicker | undefined>, save: Save) => {
  const { settingsSection } = kit
  return show(
    () => settings.get() !== undefined,
    () =>
      settingsSection(
        { title: 'Text generation' },
        autoRow(kit, settings, save),
        dynamicChild(picker, current => current && modelRow(kit, settings, current, save)),
      ),
  )
}
