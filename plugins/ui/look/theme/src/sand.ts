import type { Theme } from './contract'
import { sandPalette } from './palette'

export const sand: Theme = {
  palette: sandPalette,
  mode: 'dark',
  page: 'bg-neutral-900 font-sans text-sm text-neutral-100 antialiased scrollbars-thin selection:bg-accent-500/40',
}
