import type { Kit } from '@sand/ui-kit/contract'
import { lightScheme } from '@sand/ui-theme/contract'
import { derive, div, media } from '@vaakx-dev/vrui'
import { shades, type Theme } from '../../contract'
import { modeOf, paletteOf } from '../../palette'
import type { ThemeModel } from '../model'
import { swatchTile } from './swatch'

const roles = [
  { role: 'neutral', title: 'Base', note: 'Text from 50 to 500, surfaces from 700 to 950' },
  { role: 'accent', title: 'Accent', note: 'Buttons and your messages use 500' },
] as const

export const colorsPage = (kit: Kit, model: ThemeModel) => {
  const light = media(lightScheme)
  const theme = model.saved
  const mode = derive(() => modeOf(theme.get(), light.get()))
  const overrides = () => theme.get()?.colors?.[mode.get()] ?? {}
  const shown = (key: string) => () => {
    const current = theme.get()
    if (!current) return '#000000'
    const [role, shade] = key.split('-') as [string, string]
    return (paletteOf(current, mode.get()) as unknown as Record<string, Record<string, string>>)[role]?.[shade] ?? '#000000'
  }
  const withColor = (key: string, hex: string | undefined): Theme | null => {
    const current = theme.get()
    if (!current) return null
    const own = { ...overrides() }
    if (hex) own[key] = hex
    else delete own[key]
    return { ...current, colors: { ...current.colors, [mode.get()]: own } }
  }
  const clear = () => {
    const current = theme.get()
    if (current) model.set({ ...current, colors: { ...current.colors, [mode.get()]: {} } })
  }

  return div(
    { class: 'flex flex-col gap-8' },
    ...roles.map(({ role, title, note }) =>
      kit.pageSection(
        { title, note },
        div(
          { class: 'grid grid-cols-6 gap-3 sm:grid-cols-11' },
          shades.map(shade => {
            const key = `${role}-${shade}`
            return swatchTile({
              name: shade,
              label: `${title} ${shade}`,
              value: shown(key),
              changed: () => key in overrides(),
              preview: hex => model.preview(withColor(key, hex)),
              choose: hex => {
                const next = withColor(key, hex)
                if (next) model.set(next)
              },
            })
          }),
        ),
      ),
    ),
    kit.pageSection(
      {},
      kit.settingsRow(
        { title: () => `Changed in ${mode.get()} mode`, detail: 'Base and accent make every other colour' },
        kit.secondaryAction({ onClick: clear, disabled: () => !Object.keys(overrides()).length }, 'Use base and accent'),
      ),
    ),
  )
}
