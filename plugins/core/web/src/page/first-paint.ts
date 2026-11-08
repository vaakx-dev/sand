import { lightScheme, sandLightPalette, sandPalette } from '@sand/ui-theme/contract'

const { neutral, accent: accents } = sandPalette
const light = sandLightPalette.neutral

export const background = neutral['900']
export const text = neutral['100']
export const muted = neutral['400']
export const raised = neutral['800']
export const accent = accents['500']
export const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", sans-serif'

export const themeColors = `<meta name="theme-color" media="${lightScheme}" content="${light['900']}">
  <meta name="theme-color" content="${background}">`

export const firstPaintStyle = `<style>html{color-scheme:light dark;background:${background};color:${text}}@media ${lightScheme}{html{background:${light['900']};color:${light['100']}}}</style>`
