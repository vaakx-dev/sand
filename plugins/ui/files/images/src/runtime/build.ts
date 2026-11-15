import type { RouteHandler } from '@sand/server/contract'
import { workerHeaders } from '@sand/util/host'
import { join } from 'node:path'
import { decoderUrl } from '../contract'

interface Built {
  body: string
  etag: string
}

const HEADERS = { 'content-type': 'text/javascript; charset=utf-8', ...workerHeaders('no-cache') }

const ENTRY = join(import.meta.dir, '..', 'web', 'decoder', 'tiff-worker.ts')

const build = async (): Promise<Built> => {
  const output = await Bun.build({ entrypoints: [ENTRY], target: 'browser', conditions: ['bun'], format: 'esm', minify: true, throw: false })
  const [script] = output.outputs
  if (!output.success || !script) throw new Error(`Couldn't build the TIFF decoder:\n${output.logs.map(String).join('\n')}`)
  const body = await script.text()
  return { body, etag: `"${Bun.hash(body).toString(36)}"` }
}

const decoderResponse = (): RouteHandler => {
  let built: Promise<Built> | undefined
  return async request => {
    if (new URL(request.url).pathname !== decoderUrl) return new Response('not found', { status: 404 })
    built ??= build()
    const { body, etag } = await built
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } })
    return new Response(body, { headers: { ...HEADERS, etag } })
  }
}

export { decoderResponse }
