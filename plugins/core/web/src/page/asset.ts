import type { Bundle } from '../bundle/build'
import { pickEncoding } from './encoding'
import { headers } from './headers'

const immutable = 'public, max-age=31536000, immutable'

export const assetResponse = (request: Request, bundle: Bundle) => {
  const asset = bundle.assets.get(new URL(request.url).pathname)
  if (!asset) return new Response('not found', { status: 404, headers: headers('text/plain') })
  const encoding = pickEncoding(request.headers.get('accept-encoding'))
  const base = { ...headers(asset.type, immutable), vary: 'accept-encoding' }
  if (!encoding) return new Response(asset.body, { headers: base })
  return new Response(asset.encoded[encoding], { headers: { ...base, 'content-encoding': encoding } })
}
