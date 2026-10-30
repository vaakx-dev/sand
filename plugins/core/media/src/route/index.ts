import type { RouteHandler } from '@sand/server/contract'
import type { Tokens } from '../sign/tokens'
import type { Store } from '../store'
import { servedType } from '../store/types'
import { askedHeight, type Sized } from './sized'

export const mediaPath = '/media/'

export const mediaRoute =
  (store: Store, tokens: Tokens, sized: Sized): RouteHandler =>
  async request => {
    const url = new URL(request.url)
    const checked = tokens.check(url.pathname.slice(mediaPath.length).split('/')[0] ?? '')
    if (!checked) return new Response('this link is not valid or has expired', { status: 403 })
    const original = store.locate(checked.hash)
    if (!original) return new Response('not found', { status: 404 })
    const height = askedHeight(url.searchParams.get('h'))
    const variant = height ? await sized(checked.hash, original, height) : undefined
    const seconds = Math.max(0, Math.floor((checked.expires - Date.now()) / 1000))
    return new Response(variant ?? Bun.file(original.path), {
      headers: {
        'content-type': variant ? 'image/webp' : servedType(original.extension),
        'cache-control': `private, max-age=${seconds}`,
        'x-content-type-options': 'nosniff',
      },
    })
  }
