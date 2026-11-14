import { sandLightPalette, sandPalette, type ThemePalette } from '@sand/ui-theme/contract'
import { shades, type Theme } from './contract'

export type Mode = 'light' | 'dark'

type Scale = Record<(typeof shades)[number], string>

interface Lch {
  l: number
  c: number
  h: number
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

const channels = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const toLch = (hex: string): Lch => {
  const [r = 0, g = 0, b = 0] = channels(hex).map(value => linear(value / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, c: Math.hypot(a, bb), h: Math.atan2(bb, a) }
}

const rgbOf = ({ l, c, h }: Lch) => {
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const ss = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss, -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss, -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss]
}

const outside = (rgb: number[]) => rgb.some(value => value < -0.0005 || value > 1.0005)

export const toHex = (color: Lch) => {
  let c = color.c
  let rgb = rgbOf(color)
  while (c > 0 && outside(rgb)) {
    c = Math.max(c - 0.004, 0)
    rgb = rgbOf({ ...color, c })
  }
  return `#${rgb.map(value => Math.round(Math.min(1, Math.max(0, gamma(Math.min(1, Math.max(0, value))))) * 255).toString(16).padStart(2, '0')).join('')}`
}

const neutralLightness: Record<Mode, number[]> = {
  dark: [0.975, 0.945, 0.885, 0.8, 0.72, 0.56, 0.45, 0.285, 0.235, 0.17, 0.2],
  light: [0.16, 0.23, 0.38, 0.43, 0.48, 0.57, 0.73, 0.915, 0.95, 0.995, 0.972],
}

const scale = (make: (index: number) => string) => Object.fromEntries(shades.map((shade, index) => [shade, make(index)])) as Scale

const neutralScale = (base: Lch, mode: Mode) => {
  const chroma = Math.min(mode === 'dark' && base.l >= 0.5 ? base.c * 3 : base.c, 0.075)
  const shift = mode === 'dark' && base.l < 0.5 ? Math.max(-0.03, Math.min(0.06, base.l - 0.17)) : 0
  return scale(index => {
    const background = mode === 'dark' ? index >= 6 : index >= 7
    const l = neutralLightness[mode][index]! + (background ? shift : 0)
    const c = background ? (mode === 'dark' ? chroma : chroma * 0.35) : chroma * 0.32
    return toHex({ l, c, h: base.h })
  })
}

const towardsTop = [1, 0.92, 0.75, 0.5, 0.25]

const towardsBottom = [0.2, 0.4, 0.6, 0.8, 1]

const accentScale = (accent: Lch, mode: Mode) => {
  const top = mode === 'dark' ? 0.985 : 0.17
  const bottom = mode === 'dark' ? 0.19 : 0.985
  const mid = mode === 'dark' ? Math.max(accent.l, 0.62) : Math.min(accent.l, 0.6)
  return scale(index => {
    const k = index < 5 ? towardsTop[index]! : index === 5 ? 0 : towardsBottom[index - 6]!
    const l = mid + ((index < 5 ? top : bottom) - mid) * k
    return toHex({ l, c: accent.c * (1 - 0.65 * k), h: accent.h })
  })
}

const withOverrides = (palette: ThemePalette, overrides: Record<string, string> | undefined): ThemePalette => {
  if (!overrides) return palette
  const next: Record<string, Record<string, string>> = Object.fromEntries(Object.entries(palette).map(([role, values]) => [role, { ...(values as Record<string, string>) }]))
  for (const [key, value] of Object.entries(overrides)) {
    const cut = key.lastIndexOf('-')
    const role = next[key.slice(0, cut)]
    if (role) role[key.slice(cut + 1)] = value
  }
  return next as ThemePalette
}

export const paletteOf = (theme: Theme, mode: Mode): ThemePalette => {
  const sand = mode === 'dark' ? sandPalette : sandLightPalette
  const made = { ...sand, neutral: neutralScale(toLch(theme.base), mode), accent: accentScale(toLch(theme.accent), mode) }
  return withOverrides(made, theme.colors?.[mode])
}

const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = channels(hex).map(value => linear(value / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (one: string, two: string) => {
  const [light, dark] = [luminance(one), luminance(two)].sort((a, b) => b - a)
  return (light! + 0.05) / (dark! + 0.05)
}

export const modeOf = (theme: Theme | null, systemLight: boolean): Mode => {
  if (theme?.mode === 'light' || theme?.mode === 'dark') return theme.mode
  return systemLight ? 'light' : 'dark'
}
