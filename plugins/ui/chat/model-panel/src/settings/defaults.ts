import type { ModelInfo } from '@sand/accounts/contract'
import { settingsSet, type SettingsPatch } from '@sand/model/contract'
import type { PickerTarget } from '@sand/model-picker/contract'
import type { Page } from './page'

const save = (page: Page, patch: SettingsPatch) => void page.run(settingsSet, { patch })

export const makeDefault = (page: Page, model: ModelInfo) => save(page, { model: model.id })

const defaultsTarget = (page: Page): PickerTarget => ({
  shown: () => page.ctx.modelPicker.resolve(page.ctx.models.defaults()),
  set: ({ model, effort, speed }) => save(page, { ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }),
})

export const defaultsSection = (page: Page) => {
  const { settingsRow, settingsSection } = page.ctx.kit
  return settingsSection(
    { title: 'Defaults' },
    settingsRow('Model', page.ctx.modelPicker.button(defaultsTarget(page), 'Default model'), 'With its effort and fast mode'),
  )
}
