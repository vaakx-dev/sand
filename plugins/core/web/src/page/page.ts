import { homePcMeta } from '@sand/devices-contract'
import type { Bundle } from '../bundle/build'
import { pluginsOffMeta } from '../contract'
import { firstPaintStyle, themeColors } from './first-paint'

const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const preloads = (paths: string[]) => paths.map(path => `<link rel="modulepreload" href="${attribute(path)}">`).join('\n  ')

export const page = ({ entry, preload }: Bundle, pc: string, off: string[]) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <meta name="referrer" content="no-referrer">
  ${themeColors}
  <meta name="color-scheme" content="light dark">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="sand">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="${homePcMeta}" content="${attribute(pc)}">
  <meta name="${pluginsOffMeta}" content="${attribute(off.join(' '))}">
  <title>sand</title>
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/32x32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="/icons/64x64.png">
  <link rel="apple-touch-icon" href="/icons/192x192.png">
  <link rel="manifest" href="/manifest.webmanifest">
  ${firstPaintStyle}
  ${preloads(preload)}
</head>
<body>
  <script type="module" src="${attribute(entry)}"></script>
</body>
</html>`
