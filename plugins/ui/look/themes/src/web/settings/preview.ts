import { sandLightPalette, sandPalette } from '@sand/ui-theme/contract'
import { circle, div, rect, svg } from '@vaakx-dev/vrui'

export type Appearance = 'system' | 'light' | 'dark'

type Look = 'light' | 'dark'

const WIDTH = 160

const HEIGHT = 100

const colorsOf = (look: Look) => {
  const { neutral, accent } = look === 'dark' ? sandPalette : sandLightPalette
  return { page: neutral['900'], side: neutral['950'], line: neutral['700'], text: neutral['300'], bubble: neutral['800'], accent: accent['500'] }
}

const bar = (x: number, y: number, width: number, fill: string) => rect({ x, y, width, height: 4, rx: 2, fill })

const sketch = (look: Look, viewBox: string) => {
  const colors = colorsOf(look)
  return svg(
    { viewBox, preserveAspectRatio: 'none', class: 'block h-full w-full', 'aria-hidden': 'true' },
    rect({ width: WIDTH, height: HEIGHT, fill: colors.page }),
    rect({ width: 40, height: HEIGHT, fill: colors.side }),
    bar(7, 14, 24, colors.line),
    bar(7, 24, 20, colors.line),
    bar(7, 34, 26, colors.line),
    rect({ x: 100, y: 12, width: 48, height: 9, rx: 4.5, fill: colors.bubble }),
    rect({ x: 52, y: 30, width: 84, height: 4, rx: 2, fill: colors.text, opacity: 0.45 }),
    rect({ x: 52, y: 39, width: 70, height: 4, rx: 2, fill: colors.text, opacity: 0.45 }),
    rect({ x: 48, y: 78, width: 104, height: 14, rx: 7, fill: colors.bubble, stroke: colors.line }),
    circle({ cx: 144, cy: 85, r: 4, fill: colors.accent }),
  )
}

const whole = `0 0 ${WIDTH} ${HEIGHT}`

const half = (look: Look) => div({ class: 'h-full w-1/2' }, sketch(look, look === 'light' ? `0 0 ${WIDTH / 2} ${HEIGHT}` : `${WIDTH / 2} 0 ${WIDTH / 2} ${HEIGHT}`))

export const appearancePreview = (appearance: Appearance) =>
  div({ class: 'flex w-full', style: { aspectRatio: `${WIDTH} / ${HEIGHT}` } }, appearance === 'system' ? [half('light'), half('dark')] : sketch(appearance, whole))
