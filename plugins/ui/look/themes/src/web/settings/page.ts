import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, media, p, span } from '@vaakx-dev/vrui'
import { lightScheme, sandLightPalette, sandPalette } from '@sand/ui-theme/contract'
import { sceneIds, sceneNames, type SceneId, starters, type Theme, themeName } from '../../contract'
import { designedMode, modeOf } from '../../palette'
import type { ThemeModel } from '../model'
import type { Colors } from '../scenes'
import { swatchButton } from './swatch'
import { thumbnail } from './thumb'

export interface PageLinks {
  colors(): void
  css(): void
}

const sandLook: Theme = { name: 'Custom', base: '#0b0b0c', accent: '#e5e5e5' }

const sameLook = (one: Theme | null, two: Theme | null) => (one && two ? one.name === two.name && one.base === two.base && one.accent === two.accent && (one.scene ?? null) === (two.scene ?? null) : one === two)

const tileThemes = (current: Theme | null) => {
  const known = starters.map(starter => starter.theme)
  return known.some(theme => theme?.name === current?.name) || !current ? known : [...known, current]
}

const changedCount = (theme: Theme | null) => Object.keys(theme?.colors?.light ?? {}).length + Object.keys(theme?.colors?.dark ?? {}).length

const lineCount = (css: string | undefined) => (css?.trim() ? css.trim().split('\n').length : 0)

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const themePage = (kit: Kit, model: ThemeModel, links: PageLinks) => {
  const light = media(lightScheme)
  const current = model.saved
  const edit = (patch: Partial<Theme>) => ({ ...(current.get() ?? sandLook), ...patch })

  const tile = (theme: Theme | null) => {
    const on = derive(() => sameLook(theme, current.get()) || (theme !== null && theme.name === current.get()?.name))
    const pick = () => model.set(theme ? { ...theme, ...(current.get()?.css && { css: current.get()!.css }) } : null)
    return kit.plainButton(
      { class: 'group flex min-w-0 flex-col gap-2 text-left', 'aria-pressed': () => String(on.get()), onClick: pick },
      div(
        { class: () => ['overflow-hidden rounded-lg transition-shadow', on.get() ? 'ring-2 ring-accent-500' : 'ring-1 ring-neutral-700 group-hover:ring-neutral-600'] },
        dynamicChild(light, isLight => thumbnail(theme, theme ? designedMode(theme) : modeOf(theme, isLight), (isLight ? sandLightPalette : sandPalette) as unknown as Colors)),
      ),
      div(
        { class: 'flex min-w-0 items-center gap-1.5' },
        span({ class: () => ['min-w-0 truncate text-xs sm:text-sm', on.get() ? 'font-medium text-neutral-100' : 'text-neutral-400'] }, themeName(theme)),
        span({ class: () => (on.get() ? 'ml-auto inline-flex text-accent-400' : 'hidden') }, kit.icon('check', 'xs')),
      ),
    )
  }

  const colour = (key: 'base' | 'accent', label: string) =>
    swatchButton(kit, {
      label,
      value: () => (current.get() ?? sandLook)[key],
      preview: hex => model.preview(edit({ [key]: hex })),
      choose: hex => model.set(edit({ [key]: hex })),
    })

  const sceneLabel = (scene: SceneId | null | undefined) => (scene ? sceneNames[scene] : 'None')

  const sceneRow = kit.dropdown({
    placement: 'below-right',
    trigger: press => kit.pickerButton({ ...press, 'aria-label': 'Scene' }, () => sceneLabel(current.get()?.scene)),
    items: close =>
      [null, ...sceneIds].map(scene =>
        kit.choiceItem(
          {
            selected: () => (current.get()?.scene ?? null) === scene,
            onClick: () => {
              close()
              model.set(edit({ scene }))
            },
          },
          span({ class: 'flex-1 truncate' }, sceneLabel(scene)),
        ),
      ),
  })

  return div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection(
      {},
      div({ class: 'grid grid-cols-3 gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4' }, dynamicChild(derive(() => tileThemes(current.get())), themes => div({ class: 'contents' }, ...themes.map(tile)))),
      p({ class: 'mt-4 text-xs text-neutral-500' }, 'Or ask any bot for one, like “make it a synthwave sunset with pink accents”.'),
    ),
    kit.pageSection(
      { title: 'Colours' },
      kit.settingsRow({ title: 'Base', detail: 'Backgrounds and text, light and dark' }, colour('base', 'Base colour')),
      kit.settingsRow({ title: 'Accent', detail: 'Buttons and your messages' }, colour('accent', 'Accent colour')),
      kit.settingsRow({ title: 'Single colours', detail: () => (changedCount(current.get()) ? `${changedCount(current.get())} changed` : 'None changed'), onOpen: links.colors }),
    ),
    kit.pageSection(
      { title: 'Background' },
      kit.settingsRow({ title: 'Scene' }, sceneRow),
      kit.settingsRow(
        { title: 'Motion', detail: 'Stays still when your device asks for reduced motion' },
        kit.segmented(
          [
            { value: 'moving' as const, label: 'Moving' },
            { value: 'still' as const, label: 'Still' },
          ],
          () => current.get()?.motion ?? 'moving',
          motion => model.set(edit({ motion })),
          { label: 'Motion' },
        ),
      ),
      kit.settingsRow({ title: 'Custom CSS', detail: () => (lineCount(current.get()?.css) ? plural(lineCount(current.get()?.css), 'line', 'lines') : 'None'), onOpen: links.css }),
    ),
    kit.pageSection(
      {},
      kit.settingsRow(
        { title: 'Reset to sand’s look', detail: span('If a theme ever hides the page, open sand with ', span({ class: 'whitespace-nowrap font-mono text-neutral-400' }, '?theme=off'), '.') },
        kit.secondaryAction({ onClick: () => model.reset(), disabled: () => !current.get() }, 'Reset'),
      ),
    ),
  )
}
