import { sandPalette } from '@sand/ui-theme/palette'
import { frameScript } from './frame-script'
import { rootRule } from './tokens'

const baseCss =
  'html{background:var(--background);color:var(--foreground);font-family:var(--font-sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}' +
  'body{margin:0}code,kbd,pre,samp{font-family:var(--font-mono)}[hidden]{display:none!important}'

export const bootstrap = async () =>
  [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style>${rootRule(':where(:root)', sandPalette, 'dark')}</style>`,
    `<style>${baseCss}</style>`,
    `<script>${await frameScript()}</script>`,
  ].join('')
