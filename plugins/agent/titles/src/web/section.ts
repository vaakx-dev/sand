import type { ModelPicker, PickerTarget } from '@sand/model-picker/contract'
import type { TitlePatch, TitleSettings } from '../contract'
import { div, dynamicChild, settingsRow, settingsSection, toggleSwitch, type Sig } from '@sand/dom'

const textGenTarget = (state: Sig<TitleSettings | undefined>, picker: ModelPicker, save: (patch: TitlePatch) => void): PickerTarget => ({
  shown: () => {
    const settings = state.get()
    return settings && picker.resolve(settings)
  },
  set: ({ model, effort, speed }) => save({ ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }),
})

const section = (state: Sig<TitleSettings | undefined>, picker: ModelPicker | undefined, save: (patch: TitlePatch) => void) =>
  settingsSection(
    { title: 'Text generation' },
    settingsRow(
      'Name new threads',
      toggleSwitch({ on: () => state.get()?.auto ?? false, 'aria-label': 'Name new threads', onClick: () => save({ auto: !state.get()?.auto }) }),
      'The text gen model writes a short name from your first message',
    ),
    picker ? settingsRow('Text gen model', picker.button(textGenTarget(state, picker, save), 'Text gen model'), 'Writes thread names and branch names') : null,
  )

export const titlesSection = (state: Sig<TitleSettings | undefined>, picker: Sig<ModelPicker | undefined>, save: (patch: TitlePatch) => void) =>
  dynamicChild(picker, current =>
    dynamicChild(
      state.map(settings => Boolean(settings)),
      loaded => (loaded ? section(state, current, save) : div({ class: 'hidden' })),
    ),
  )
