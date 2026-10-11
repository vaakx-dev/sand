import { frameScript } from './frame-script'
import { themeVariables } from './tokens'

const rootRule = `:root{color-scheme:dark;${Object.entries(themeVariables())
  .map(([name, value]) => `${name}:${value};`)
  .join('')}}`

const baseCss =
  'html{background:var(--background);color:var(--foreground);font-family:var(--font-sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}' +
  'body{margin:0}code,kbd,pre,samp{font-family:var(--font-mono)}'

export const bootstrap = async () =>
  [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style>${rootRule}</style>`,
    `<style>${baseCss}</style>`,
    `<script>${await frameScript()}</script>`,
  ].join('')
