import type { ColorMode, ColorThemeInput } from '@vaakx-dev/vrui'
import { service } from 'drydock'

export type ThemeRole = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'orange' | 'sky'

export type ThemePalette = ColorThemeInput & Record<ThemeRole, ColorThemeInput[string]>

export interface Theme {
  palette: ThemePalette
  mode: ColorMode
  page: string
}

export const theme = service<Theme>('theme')
