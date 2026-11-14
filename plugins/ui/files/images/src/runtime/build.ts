import type { RouteHandler } from '@sand/server/contract'
import { workerHeaders } from '@sand/util/host'
import { join } from 'node:path'
import { type Decoder, decoders, decoderUrl } from '../contract'

interface Built {
  body: string
  etag: string
}

const HEADERS = { 'content-type': 'text/javascript; charset=utf-8', ...workerHeaders('no-cache') }

const entryOf = (decoder: Decoder) => join(import.meta.dir, '..', 'web', 'decoder', `${decoder}-worker.ts`)

const build = async (decoder: Decoder): Promise<Built> => {
  const output = await Bun.build({ entrypoints: [entryOf(decoder)], target: 'browser', conditions: ['bun'], format: 'esm', minify: true, throw: false })
  const [script] = output.outputs
  if (!output.success || !script) throw new Error(`Couldn't build the ${decoder} decoder:\n${output.logs.map(String).join('\n')}`)
  const body = await script.text()
  return { body, etag: `"${Bun.hash(body).toString(36)}"` }
}

const decoderResponse = (): RouteHandler => {
  const built = new Map<string, Promise<Built>>()
  const byUrl = new Map(decoders.map(decoder => [decoderUrl(decoder), decoder]))
  return async request => {
    const decoder = byUrl.get(new URL(request.url).pathname)
    if (!decoder) return new Response('not found', { status: 404 })
    if (!built.has(decoder)) built.set(decoder, build(decoder))
    const { body, etag } = await built.get(decoder)!
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } })
    return new Response(body, { headers: { ...HEADERS, etag } })
  }
}

export { decoderResponse }
