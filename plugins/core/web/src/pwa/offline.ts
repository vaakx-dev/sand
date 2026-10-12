import { background, border, font, heading, muted, text } from '../page/first-paint'

export const offlinePage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${background}">
<title>sand</title>
<style>
html,body{height:100%;margin:0}
body{display:flex;align-items:center;justify-content:center;background:${background};color:${text};font:15px/1.5 ${font};text-align:center;padding:24px;box-sizing:border-box}
h1{font-size:18px;font-weight:600;margin:0 0 8px;color:${heading}}
p{margin:0 0 20px;color:${muted}}
a{display:inline-block;padding:8px 16px;border:1px solid ${border};border-radius:8px;color:${heading};text-decoration:none}
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
