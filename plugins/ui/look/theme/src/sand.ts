import type { Theme } from './contract'
import { sandPalette } from './palette'
import { sandLightPalette } from './palette-light'

const page = 'bg-neutral-900 font-sans text-sm text-neutral-100 antialiased scrollbars-thin'

export const sand: Theme = {
  palette: sandPalette,
  mode: 'dark',
  page: `${page} selection:bg-accent-500/40`,
}

export const sandLight: Theme = {
  palette: sandLightPalette,
  mode: 'light',
  page: `${page} selection:bg-accent-500/20`,
}
