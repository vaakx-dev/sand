import { lightScheme } from '@sand/ui-theme/contract'
import { dark, font, light, themeColors, type PageColors } from '../page/first-paint'

const paint = ({ background, text, muted, raised, accent }: PageColors) =>
  `body{background:${background};color:${text}}p{color:${muted}}a{background:${raised};color:${text}}a:focus-visible{outline-color:${accent}}`

export const offlinePage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${themeColors}
<meta name="color-scheme" content="light dark">
<title>sand</title>
<style>
html,body{height:100%;margin:0}
body{display:flex;align-items:center;justify-content:center;font:14px/1.5 ${font};text-align:center;padding:24px;box-sizing:border-box}
h1{font-size:16px;font-weight:500;margin:0 0 4px}
p{margin:0 0 16px}
a{display:inline-block;padding:6px 12px;border-radius:6px;text-decoration:none}
a:focus-visible{outline:2px solid;outline-offset:2px}
${paint(dark)}
@media ${lightScheme}{${paint(light)}}
</style>
</head>
<body>
<main>
<h1>sand can't reach this PC right now</h1>
<p>Check that the PC is on and that this device is on its network.</p>
<a href="/">Retry</a>
</main>
</body>
</html>`
