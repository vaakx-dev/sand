import type { ColorMode, ColorThemeInput } from '@vaakx-dev/vrui'
import { service } from 'drydock'

export * from './palette'

export type ThemeRole = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'sky'

export type ThemePalette = ColorThemeInput & Record<ThemeRole, ColorThemeInput[string]>

export interface Theme {
  palette: ThemePalette
  mode: ColorMode
  page: string
}

export const theme = service<Theme>('theme')
