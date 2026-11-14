import { SHARE_PATH } from '../contract'
import { dark, light, type PageColors } from '../page/first-paint'

export const schemeHint = 'Sec-CH-Prefers-Color-Scheme'

const icon = (size: number) => ({ src: `/icons/${size}x${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })

const manifestFor = ({ background }: PageColors) =>
  JSON.stringify({
    id: '/',
    name: 'sand',
    short_name: 'sand',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: background,
    theme_color: background,
    icons: [icon(192), icon(512)],
    share_target: {
      action: SHARE_PATH,
      method: 'POST',
      enctype: 'multipart/form-data',
      params: { title: 'title', text: 'text', url: 'url', files: [{ name: 'files', accept: ['*/*'] }] },
    },
  })

const manifests = { dark: manifestFor(dark), light: manifestFor(light) }

const schemeOf = (request: Request) => (request.headers.get(schemeHint)?.includes('light') ? 'light' : 'dark')

export const manifestRoute = (request: Request) =>
  new Response(manifests[schemeOf(request)], {
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'no-cache',
      vary: schemeHint,
      'x-content-type-options': 'nosniff',
    },
  })
