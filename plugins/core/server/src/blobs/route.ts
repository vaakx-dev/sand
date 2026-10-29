import type { RouteHandler } from '../contract'
import { askedHeight, type Sized } from './sized'
import { contentType } from './sniff'
import type { FindBlob } from './store'

const cached = (tag: string) => ({ etag: `"${tag}"`, 'cache-control': 'private, max-age=31536000, immutable' })

export const blobRoute =
  (find: FindBlob, sized: Sized): RouteHandler =>
  async request => {
    const params = new URL(request.url).searchParams
    const hash = params.get('hash') ?? ''
    const found = await find(hash, params.get('session'))
    if (!found) return new Response('not found', { status: 404 })
    const height = askedHeight(params.get('h'))
    const headers = cached(height ? `${hash}.${height}` : hash)
    if (request.headers.get('if-none-match') === headers.etag) return new Response(null, { status: 304, headers })
    const file = height ? await sized(hash, found, height) : found
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    return new Response(file, { headers: { ...headers, 'content-type': contentType(head), 'x-content-type-options': 'nosniff' } })
  }
