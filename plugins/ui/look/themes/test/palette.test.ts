import { expect, test } from 'bun:test'
import { starters, type Theme } from '../src/contract'
import { contrast, paletteOf } from '../src/palette'

const themes = starters.flatMap(starter => (starter.theme ? [starter.theme] : []))

test.each(themes.flatMap(theme => (['light', 'dark'] as const).map(mode => [theme.name, mode, theme] as const)))('%s in %s keeps body text easy to read', (_name, mode, theme) => {
  const { neutral, accent } = paletteOf(theme, mode) as unknown as Record<'neutral' | 'accent', Record<string, string>>
  expect(contrast(neutral['100']!, neutral['900']!)).toBeGreaterThan(10)
  expect(contrast(neutral['100']!, neutral['800']!)).toBeGreaterThan(8)
  expect(contrast(neutral['500']!, neutral['900']!)).toBeGreaterThan(3)
  expect(contrast(accent['500']!, neutral['900']!)).toBeGreaterThan(2.5)
})

test('base and accent colour the whole set, and a single colour can be overridden for one mode', () => {
  const theme: Theme = { name: 'Lab', base: '#1a1033', accent: '#ff4fa3', colors: { dark: { 'accent-500': '#00ff88' } } }
  const dark = paletteOf(theme, 'dark') as Record<string, Record<string, string>>
  const light = paletteOf(theme, 'light') as Record<string, Record<string, string>>
  expect(dark.accent!['500']).toBe('#00ff88')
  expect(light.accent!['500']).not.toBe('#00ff88')
  expect(Object.keys(dark.neutral!)).toHaveLength(11)
  expect(dark.success).toBeDefined()
})
