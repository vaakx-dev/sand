import type { RouteHandler } from '../contract'
import { contentType } from './sniff'
import type { FindBlob } from './store'

const cached = (hash: string) => ({ etag: `"${hash}"`, 'cache-control': 'private, max-age=31536000, immutable' })

export const blobRoute =
  (find: FindBlob): RouteHandler =>
  async request => {
    const params = new URL(request.url).searchParams
    const hash = params.get('hash') ?? ''
    const file = await find(hash, params.get('session'))
    if (!file) return new Response('not found', { status: 404 })
    const headers = cached(hash)
    if (request.headers.get('if-none-match') === headers.etag) return new Response(null, { status: 304, headers })
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    return new Response(file, { headers: { ...headers, 'content-type': contentType(head), 'x-content-type-options': 'nosniff' } })
  }
