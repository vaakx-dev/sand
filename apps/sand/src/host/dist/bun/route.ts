import type { HttpRoute } from '@sand/protocol'
import { allowed, type DistAuth, reportSending, unauthorized } from '../route'
import { cachedBun } from './cache'
import { UnknownBunTarget } from './github'
import { validTarget } from './home'

interface BunRouteOptions extends DistAuth {
  home: string
}

const text = (body: string, status: number) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })

const failure = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return text(message, error instanceof UnknownBunTarget ? 404 : 502)
}

export const bunRoute = (options: BunRouteOptions): HttpRoute => ({
  method: 'GET',
  async handle(call) {
    if (!allowed(call, options)) return unauthorized()
    const target = call.url.searchParams.get('target') ?? ''
    if (!validTarget.test(target)) return text(`${target || 'no target'} is not a Bun build target`, 400)
    reportSending(call, options)
    try {
      const cached = await cachedBun(options.home, target)
      return new Response(Bun.file(cached.file), {
        headers: {
          'content-type': 'application/gzip',
          'cache-control': 'no-store',
          'x-sand-bun-version': cached.version,
          'x-sand-bun-sha256': cached.sha256,
        },
      })
    } catch (error) {
      return failure(error)
    }
  },
})
