import type { ModelInfo } from '@sand/llm-accounts/contract'
import type { PickerTarget } from '@sand/model-picker/contract'
import { speedWords } from '../actions'
import type { Page } from './page'

const save = (page: Page, command: string, value: string) =>
  void page.run({ type: 'ui.command', name: command, args: `${value} --default --quiet`, cwd: page.ctx.threads.cwd() })

export const makeDefault = (page: Page, model: ModelInfo) => save(page, 'model', model.id)

const defaultsTarget = (page: Page): PickerTarget => ({
  shown: () => page.ctx.modelPicker.resolve(page.ctx.models.defaults()),
  set: patch => {
    if (patch.model) save(page, 'model', patch.model)
    if (patch.effort) save(page, 'effort', patch.effort)
    if (patch.speed) save(page, 'fast', speedWords[patch.speed])
  },
})

export const defaultsSection = (page: Page) => {
  const { settingsRow, settingsSection } = page.ctx.kit
  return settingsSection(
    { title: 'New threads' },
    settingsRow('Model', page.ctx.modelPicker.button(defaultsTarget(page), 'Model for new threads'), 'With its effort and fast mode'),
  )
}
