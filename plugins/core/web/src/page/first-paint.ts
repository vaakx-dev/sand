import { lightScheme, sandLightPalette, sandPalette } from '@sand/ui-theme/contract'

export interface PageColors {
  background: string
  text: string
  muted: string
  raised: string
  accent: string
}

const colorsOf = ({ neutral, accent }: typeof sandPalette): PageColors => ({
  background: neutral['900'],
  text: neutral['100'],
  muted: neutral['400'],
  raised: neutral['800'],
  accent: accent['500'],
})

export const dark = colorsOf(sandPalette)
export const light = colorsOf(sandLightPalette)

export const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", sans-serif'

export const themeColors = `<meta name="theme-color" media="${lightScheme}" content="${light.background}">
  <meta name="theme-color" content="${dark.background}">`

export const firstPaintStyle = `<style>html{color-scheme:light dark;background:${dark.background};color:${dark.text}}@media ${lightScheme}{html{background:${light.background};color:${light.text}}}</style>`
