import { pickSet, type SettingsPatch, type Use, uses } from '@sand/model/contract'
import type { PickerTarget } from '@sand/model-picker/contract'
import { show } from '@vaakx-dev/vrui'
import type { Page } from './page'

interface UseText {
  title: string
  detail: string
}

const USE_TEXT: Record<Use, UseText> = {
  default: { title: 'Default model', detail: 'Chats, bots and the agents bots start' },
  subagent: { title: 'Subagent model', detail: 'Agents that chats hand work to' },
  text: { title: 'Text model', detail: 'Titles, summaries and other background text' },
}

const save = (page: Page, use: Use, patch: SettingsPatch) => void page.run(() => page.ctx.wire.call(pickSet, { use, ...patch }))

const chosen = (page: Page, use: Use) => page.ctx.models.picks().chosen[use]

const fallbackText = (use: Use) => (use === 'default' ? 'uses the first model until you pick one' : 'uses the default model')

const detailOf = (page: Page, use: Use) => {
  const { detail } = USE_TEXT[use]
  return chosen(page, use) ? detail : `${detail}; ${fallbackText(use)}`
}

const useTarget = (page: Page, use: Use): PickerTarget => ({
  shown: () => page.ctx.modelPicker.resolve(page.ctx.models.picks().shown[use] ?? {}),
  set: patch => save(page, use, patch),
})

const useRow = (page: Page, use: Use) => {
  const { icon, iconButton, settingsRow } = page.ctx.kit
  const { title } = USE_TEXT[use]
  const detail = page.changes.read(() => detailOf(page, use))
  const clearable = page.changes.read(() => Boolean(chosen(page, use)))
  const clear = () => iconButton({ title: 'Stop using this model here', 'aria-label': `Clear ${title}`, onClick: () => save(page, use, { model: null }) }, icon('x'))
  return settingsRow(
    { title, detail: () => detail.get() },
    show(() => clearable.get(), clear),
    page.ctx.modelPicker.button(useTarget(page, use), { label: title }),
  )
}

const pickDefault = (page: Page) => page.ctx.kit.banner({ tone: 'accent', title: 'Pick a default model', detail: 'Chats, bots, subagents and background text use it unless you set their own.' })

export const picksSection = (page: Page) =>
  page.ctx.kit.settingsSection(
    { title: 'For each job' },
    show(page.changes.read(() => !chosen(page, 'default')), () => pickDefault(page)),
    ...uses.map(use => useRow(page, use)),
  )
