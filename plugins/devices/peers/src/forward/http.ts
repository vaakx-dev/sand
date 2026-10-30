import { devicePaths } from '@sand/devices-contract'
import type { HttpRoute } from '@sand/host-gateway/contract'
import { mediaPath } from '@sand/media/contract'
import { errorMessage } from '@sand/util'
import { textReply } from '@sand/util/host'
import { replyHeaders } from '../encoding'

const passedPaths = [mediaPath]
const passedHeaders = ['accept', 'if-none-match', 'if-modified-since']
const fetchTimeout = 30_000

const splitPath = (pathname: string) => {
  const rest = pathname.slice(devicePaths.via.length + 1)
  const slash = rest.indexOf('/')
  return slash > 0 ? { pc: decodeURIComponent(rest.slice(0, slash)), path: rest.slice(slash) } : undefined
}

const targetOf = (base: string, path: string, search: string) => {
  const target = new URL(`${path}${search}`, base)
  const passable = target.origin === new URL(base).origin && passedPaths.some(prefix => target.pathname.startsWith(prefix))
  return passable ? target : undefined
}

const headersOf = (request: Request) => {
  const headers = new Headers()
  for (const name of passedHeaders) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}

const pass = async (request: Request, target: URL) => {
  const response = await fetch(target, {
    method: request.method,
    headers: headersOf(request),
    redirect: 'manual',
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(fetchTimeout)]),
  })
  return new Response(response.body, { status: response.status, headers: replyHeaders(response.headers) })
}

const refused = () => textReply("that path can't be fetched through this PC", 404)

export const viaHttpRoute = (baseOf: (pc: string) => string): HttpRoute => ({
  method: 'GET',
  prefix: true,
  async handle({ request, url }) {
    try {
      const split = splitPath(url.pathname)
      const target = split && targetOf(baseOf(split.pc), split.path, url.search)
      return target ? await pass(request, target) : refused()
    } catch (error) {
      return textReply(errorMessage(error), 502)
    }
  },
})
