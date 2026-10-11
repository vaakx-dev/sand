import { neutral } from '@sand/dom/palette'

const icon = (size: number) => ({ src: `/icons/${size}x${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })

const manifest = JSON.stringify({
  id: '/',
  name: 'sand',
  short_name: 'sand',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: neutral['900'],
  theme_color: neutral['900'],
  icons: [icon(192), icon(512)],
})

export const manifestRoute = () =>
  new Response(manifest, {
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  })
