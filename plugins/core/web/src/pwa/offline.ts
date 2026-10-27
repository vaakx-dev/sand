import { accent, background, font, muted, raised, text } from '../page/first-paint'

export const offlinePage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${background}">
<title>sand</title>
<style>
html,body{height:100%;margin:0}
body{display:flex;align-items:center;justify-content:center;background:${background};color:${text};font:14px/1.5 ${font};text-align:center;padding:24px;box-sizing:border-box}
h1{font-size:16px;font-weight:500;margin:0 0 4px}
p{margin:0 0 16px;color:${muted}}
a{display:inline-block;padding:6px 12px;background:${raised};border-radius:6px;color:${text};text-decoration:none}
a:focus-visible{outline:2px solid ${accent};outline-offset:2px}
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
