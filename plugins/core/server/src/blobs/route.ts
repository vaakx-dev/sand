import type { RouteHandler } from '../contract'
import { contentType } from './sniff'
import type { BlobStore } from './store'

export const blobPath = '/blob'

const cached = (hash: string) => ({ etag: `"${hash}"`, 'cache-control': 'private, max-age=31536000, immutable' })

export const blobRoute =
  (store: BlobStore, recover: (session: string) => Promise<void>): RouteHandler =>
  async request => {
    const params = new URL(request.url).searchParams
    const hash = params.get('hash') ?? ''
    const session = params.get('session')
    let file = await store.file(hash)
    if (!file && session) {
      await recover(session)
      file = await store.file(hash)
    }
    if (!file) return new Response('not found', { status: 404 })
    const headers = cached(hash)
    if (request.headers.get('if-none-match') === headers.etag) return new Response(null, { status: 304, headers })
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    return new Response(file, { headers: { ...headers, 'content-type': contentType(head), 'x-content-type-options': 'nosniff' } })
  }
