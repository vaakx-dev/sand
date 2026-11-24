import { pickSet, type SettingsPatch, type Use, uses } from '@sand/model/contract'
import type { PickerTarget } from '@sand/model-picker/contract'
import { settingMark, type SettingsItem } from '@sand/settings/contract'
import type { Page } from './page'

const USE_ITEMS: Record<Use, SettingsItem> = {
  default: { id: 'default-model', label: 'Default model', keywords: ['model', 'chats', 'bots'] },
  subagent: { id: 'subagent-model', label: 'Subagent model', keywords: ['subagents', 'agents'] },
  text: { id: 'text-model', label: 'Text model', keywords: ['titles', 'summaries', 'background'] },
}

const UNSET_TEXT: Record<Use, string> = {
  default: 'Not set',
  subagent: 'Same as default',
  text: 'Same as default',
}

const save = (page: Page, use: Use, patch: SettingsPatch) => void page.run(() => page.ctx.wire.call(pickSet, { use, ...patch }))

const chosen = (page: Page, use: Use) => page.ctx.models.picks().chosen[use]

const useTarget = (page: Page, use: Use): PickerTarget => ({
  shown: () => page.ctx.modelPicker.resolve(page.ctx.models.picks().shown[use] ?? {}),
  set: patch => save(page, use, patch),
})

const useRow = (page: Page, use: Use) => {
  const { id, label } = USE_ITEMS[use]
  const set = page.changes.read(() => Boolean(chosen(page, use)))
  return page.ctx.kit.settingsRow(
    {
      ...settingMark(id),
      title: label,
      detail: () => (set.get() ? '' : UNSET_TEXT[use]),
      reset: { changed: () => set.get(), run: () => save(page, use, { model: null }) },
    },
    page.ctx.modelPicker.button(useTarget(page, use), { label }),
  )
}

export const pickItems = uses.map(use => USE_ITEMS[use])

export const picksSection = (page: Page) => page.ctx.kit.settingsSection({ title: 'For each job' }, ...uses.map(use => useRow(page, use)))
