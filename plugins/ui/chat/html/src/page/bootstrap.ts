import { sandPalette } from '@sand/ui-theme/contract'
import { baseCss } from './base'
import { frameScript } from './frame-script'
import { themeStyle } from './protocol'
import { rootRule } from './tokens'

export const bootstrap = async () =>
  [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style id="${themeStyle}">${rootRule(sandPalette, 'dark')}</style>`,
    `<style>${baseCss}</style>`,
    `<script>${await frameScript()}</script>`,
  ].join('')
