import { pageCss } from '@sand/dom/page'

const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export const page = (build: string, enabled: Record<string, boolean>) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <meta name="referrer" content="no-referrer">
  <meta name="theme-color" content="#0e0e0f">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="sand">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="sand-extensions" content="${attribute(JSON.stringify(enabled))}">
  <title>sand</title>
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/32x32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="/icons/64x64.png">
  <link rel="apple-touch-icon" href="/icons/192x192.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <style>${pageCss}</style>
</head>
<body>
  <div id="stage"></div>
  <script type="module" src="/app.js?build=${encodeURIComponent(build)}"></script>
</body>
</html>`
