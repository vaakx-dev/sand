import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import type { ModelPicker, PickerTarget } from '@sand/model-picker/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, show, type Sig } from '@vaakx-dev/vrui'

type Save = (patch: SettingsPatch) => void

const workerTarget = (settings: Sig<SessionSettings | undefined>, picker: ModelPicker, save: Save): PickerTarget => ({
  shown: () => {
    const current = settings.get()
    return current && picker.resolve(current)
  },
  set: save,
})

const modelRow = ({ settingsRow }: Kit, settings: Sig<SessionSettings | undefined>, picker: ModelPicker, save: Save) =>
  settingsRow('Worker model', picker.button(workerTarget(settings, picker, save), 'Worker model'), 'Runs the browser and web search agents')

export const workerSection = (kit: Kit, settings: Sig<SessionSettings | undefined>, picker: Sig<ModelPicker | undefined>, save: Save) =>
  show(
    () => settings.get() !== undefined,
    () => kit.settingsSection({ title: 'Workers' }, dynamicChild(picker, current => current && modelRow(kit, settings, current, save))),
  )
