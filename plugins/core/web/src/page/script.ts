import type { Bundle } from '../bundle/build'
import { pickEncoding } from './encoding'
import { headers } from './headers'

const immutable = 'public, max-age=31536000, immutable'

export const scriptResponse = (request: Request, bundle: Bundle) => {
  const build = new URL(request.url).searchParams.get('build')
  const cache = build === bundle.id ? immutable : 'no-store'
  const encoding = pickEncoding(request.headers.get('accept-encoding'))
  const base = { ...headers('text/javascript', cache), vary: 'accept-encoding' }
  if (!encoding) return new Response(bundle.script, { headers: base })
  return new Response(bundle.encoded[encoding], { headers: { ...base, 'content-encoding': encoding } })
}
