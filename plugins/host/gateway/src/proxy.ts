import type { Runtimes } from '@sand/host-runtimes/contract'
import { upstreamUrl } from '@sand/util/boot'
import { textReply } from '@sand/util/host'
import type { RouteCaller } from './contract'

const hopByHop = new Set(['connection', 'keep-alive', 'upgrade', 'transfer-encoding', 'host'])
const credentials = new Set(['authorization', 'cookie'])
const bodiless = new Set(['GET', 'HEAD'])
const waitForRuntime = 30_000

const requestHeaders = (headers: Headers) => {
  const copy = new Headers()
  headers.forEach((value, key) => {
    if (!hopByHop.has(key) && !credentials.has(key)) copy.set(key, value)
  })
  return copy
}

const responseHeaders = (headers: Headers, secret: string) => {
  const copy = new Headers()
  headers.forEach((value, key) => {
    if (!hopByHop.has(key) && !value.includes(secret)) copy.append(key, value)
  })
  return copy
}

export const createProxy = (runtimes: Runtimes) => async (request: Request, caller: RouteCaller | undefined) => {
  const runtime = runtimes.current() ?? (await runtimes.wait(waitForRuntime))
  if (!runtime) return textReply('sand is starting, try again in a moment', 503, { 'retry-after': '2' })
  try {
    const upstream = await fetch(upstreamUrl(runtime.url, new URL(request.url), runtime.secret, Boolean(caller), caller), {
      method: request.method,
      headers: requestHeaders(request.headers),
      body: bodiless.has(request.method) ? undefined : request.body,
      redirect: 'manual',
      decompress: false,
      signal: request.signal,
    })
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders(upstream.headers, runtime.secret),
    })
  } catch {
    return textReply('the sand runtime is not answering', 502)
  }
}

export type Proxy = ReturnType<typeof createProxy>
