import type { ColorMode, ColorThemeInput } from '@vaakx-dev/vrui'

export type ThemeRole = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'orange' | 'sky'

export type ThemePalette = ColorThemeInput & Record<ThemeRole, ColorThemeInput[string]>

export interface Theme {
  palette: ThemePalette
  mode: ColorMode
  page: string
}

declare module 'drydock' {
  interface Services {
    theme: Theme
  }
}
