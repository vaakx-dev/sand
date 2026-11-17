import type { ModelInfo } from '@sand/accounts/contract'
import { type Level, levelSet, levels, levelSettings, levelSource, type SettingsPatch } from '@sand/model/contract'
import type { PickerTarget } from '@sand/model-picker/contract'
import { show } from '@vaakx-dev/vrui'
import type { Page } from './page'

interface LevelText {
  title: string
  detail: string
}

const LEVEL_TEXT: Record<Level, LevelText> = {
  bot: { title: 'Bot', detail: "A bot's own chat" },
  main: { title: 'Main', detail: 'Threads and the agents doing the main work' },
  sub: { title: 'Sub', detail: 'Routine edits and clear jobs' },
  light: { title: 'Light', detail: 'Finding files, docs and pages; basic computer use' },
  background: { title: 'Background', detail: 'Titles, summaries and other small jobs' },
}

const save = (page: Page, level: Level, patch: SettingsPatch) => void page.run(() => page.ctx.wire.call(levelSet, { level, ...patch }))

export const makeDefault = (page: Page, model: ModelInfo) => save(page, 'main', { model: model.id })

const picks = (page: Page) => page.ctx.models.levels()

const own = (page: Page, level: Level) => Boolean(picks(page)[level]?.model)

const detailOf = (page: Page, level: Level) => {
  const { detail } = LEVEL_TEXT[level]
  const source = levelSource(picks(page), level)
  return source === level ? detail : `${detail}; uses ${LEVEL_TEXT[source].title}`
}

const levelTarget = (page: Page, level: Level): PickerTarget => ({
  shown: () => page.ctx.modelPicker.resolve(levelSettings(picks(page), level)),
  set: patch => save(page, level, patch),
})

const levelRow = (page: Page, level: Level) => {
  const { icon, iconButton, settingsRow } = page.ctx.kit
  const { title } = LEVEL_TEXT[level]
  const detail = page.changes.read(() => detailOf(page, level))
  const clearable = page.changes.read(() => level !== 'main' && own(page, level))
  const clear = () => iconButton({ title: 'Use the next level up', 'aria-label': `Clear ${title}`, onClick: () => save(page, level, { model: null }) }, icon('x'))
  return settingsRow(
    { title, detail: () => detail.get() },
    show(() => clearable.get(), clear),
    page.ctx.modelPicker.button(levelTarget(page, level), { label: `${title} model` }),
  )
}

export const levelsSection = (page: Page) =>
  page.ctx.kit.settingsSection({ title: 'Levels' }, ...levels.map(level => levelRow(page, level)))
