import type { ImageBlock } from '@sand/chats/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export const sceneIds = ['blueprint', 'halftone', 'skyline', 'sunset'] as const

export type SceneId = (typeof sceneIds)[number]

export const sceneNames: Record<SceneId, string> = {
  blueprint: 'Blueprint grid',
  halftone: 'Halftone',
  skyline: 'Pixel skyline',
  sunset: 'Sunset grid',
}

export const colorRoles = ['neutral', 'accent', 'success', 'warning', 'danger', 'info', 'orange', 'sky', 'violet'] as const

export const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

export const modes = ['system', 'light', 'dark'] as const

export const cssLimit = 20_000

const hex = () =>
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'A colour like #1a1033')
    .transform(value => value.toLowerCase())

const colorKey = () => z.string().regex(new RegExp(`^(${colorRoles.join('|')})-(${shades.join('|')})$`), 'A colour name like accent-500 or neutral-900')

const colorSet = () => z.record(colorKey(), hex())

export const themeSchema = () =>
  z.object({
    name: z.string().trim().min(1).max(60).optional().describe('Theme name'),
    base: hex().optional().describe("Base colour for backgrounds and text; sand's own when left out"),
    accent: hex().optional().describe("Accent for buttons, links and your messages; sand's own when left out"),
    mode: z.enum(modes).optional().describe('Force light or dark; default follows the system'),
    colors: z
      .object({ light: colorSet().optional(), dark: colorSet().optional() })
      .optional()
      .describe('Colour overrides per mode, by name like accent-500'),
    scene: z.enum(sceneIds).nullable().optional().describe('Animated background, or null for none'),
    motion: z.enum(['moving', 'still']).optional().describe('Whether the background moves (default) or stays still'),
    css: z.string().max(cssLimit).optional().describe('Custom CSS; target [data-part="…"]. Internet loads are stripped'),
  })

export type Theme = z.output<ReturnType<typeof themeSchema>>

export interface Trial {
  id: string
  previous: Theme | null
  until: number
}

export interface ThemeState {
  theme: Theme | null
  updated: number
  trial?: Trial
}

export const themeActions = ['read', 'set', 'reset'] as const

export type ThemeAction = (typeof themeActions)[number]

export const themeAct = request('theme', {
  input: () => z.object({ action: z.enum(themeActions), theme: themeSchema().optional() }),
  output: type<ThemeState>(),
})

export const themeDecide = request('theme.decide', {
  input: () => z.object({ trial: z.string().min(1), keep: z.boolean() }),
  output: type<ThemeState>(),
})

export const themeExchange = request('theme.exchange', {
  input: () => z.object({ theme: themeSchema().nullable(), updated: z.number() }),
  output: type<Pick<ThemeState, 'theme' | 'updated'>>(),
  callers: 'pc',
})

export const themeChanged = wireEvent<ThemeState>('theme.changed')

export const helloTheme = helloField<ThemeState>('theme')

export const trialMs = 30_000

export const offParam = 'theme'

export const offValue = 'off'

export const themeTrialEntry = 'theme-trial'

export interface ThemeTrialEntry {
  trial: string
  theme: Theme
  previous: Theme | null
  desktop?: ImageBlock
  phone?: ImageBlock
}

export const themeName = (theme: Theme | null) => theme?.name ?? 'Sand'
