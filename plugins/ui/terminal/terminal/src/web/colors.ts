import type { ThemePalette, ThemeRole } from '@sand/ui-theme/contract'
import { type Shade, theme } from '@vaakx-dev/vrui'
import type { ITheme } from '@xterm/xterm'

export const terminalColors = (palette: ThemePalette): ITheme => {
  const { colors } = theme(palette)
  const color = (role: ThemeRole, shade: Shade) => colors[role]?.[shade]
  const neutral = (shade: Shade) => color('neutral', shade)
  return {
    background: neutral('950'),
    foreground: neutral('200'),
    cursor: neutral('200'),
    cursorAccent: neutral('950'),
    selectionBackground: `${color('accent', '500')}66`,
    black: neutral('700'),
    brightBlack: neutral('500'),
    white: neutral('300'),
    brightWhite: neutral('100'),
    red: color('danger', '400'),
    brightRed: color('danger', '300'),
    green: color('success', '400'),
    brightGreen: color('success', '300'),
    yellow: color('warning', '400'),
    brightYellow: color('warning', '300'),
    blue: color('info', '400'),
    brightBlue: color('info', '300'),
    magenta: color('violet', '400'),
    brightMagenta: color('violet', '300'),
    cyan: color('sky', '400'),
    brightCyan: color('sky', '300'),
  }
}
