import type { Server } from 'bun'
import type { Passes } from './passes'
import { bridgeOf, type Bridge, upstreamSocket } from './socket'

interface Upstream {
  port: number
  address: string
}

interface ProxyOptions {
  upstream: Upstream
  passes: Passes
  hostnames: string[]
}

const OPEN_PATH = '/.sand/open'
const TICKET_PARAM = 'ticket'
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'upgrade', 'transfer-encoding', 'host', 'proxy-connection'])
const BODILESS = new Set(['GET', 'HEAD'])
const SOCKET_CLOSE_OK = 1000

const cookiesOf = (header: string | null) =>
  new Map(
    (header ?? '')
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => [part.slice(0, part.indexOf('=')), part.slice(part.indexOf('=') + 1)] as const),
  )

const withoutCookie = (header: string, name: string) =>
  header
    .split(';')
    .map(part => part.trim())
    .filter(part => part && !part.startsWith(`${name}=`))
    .join('; ')

const plainText = (text: string, status: number) => new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })

const firstListening = <T>(hostnames: string[], listen: (hostname: string) => T) => {
  const failures: unknown[] = []
  for (const hostname of hostnames) {
    try {
      return listen(hostname)
    } catch (error) {
      failures.push(error)
    }
  }
  throw new AggregateError(failures, "sand couldn't open a port for this dev server")
}

export const createProxy = ({ upstream, passes, hostnames }: ProxyOptions) => {
  const origin = `http://${upstream.address}:${upstream.port}`
  const shownOrigin = `http://localhost:${upstream.port}`
  const loopbackOrigins = [shownOrigin, `http://127.0.0.1:${upstream.port}`, `http://[::1]:${upstream.port}`]
  const cookie = `sand-dev-server-${upstream.port}`

  const toUpstream = (value: string, own: string) => (value.startsWith(own) ? shownOrigin + value.slice(own.length) : value)

  const toVisitor = (value: string) => {
    const matched = loopbackOrigins.find(candidate => value.startsWith(candidate))
    return matched ? value.slice(matched.length) || '/' : value
  }

  const upstreamHeaders = (request: Request, own: string) => {
    const headers = new Headers()
    request.headers.forEach((value, name) => {
      if (!HOP_BY_HOP.has(name)) headers.set(name, value)
    })
    headers.set('host', `localhost:${upstream.port}`)
    for (const name of ['origin', 'referer']) {
      const value = headers.get(name)
      if (value) headers.set(name, toUpstream(value, own))
    }
    const cookies = withoutCookie(headers.get('cookie') ?? '', cookie)
    if (cookies) headers.set('cookie', cookies)
    else headers.delete('cookie')
    return headers
  }

  const visitorHeaders = (headers: Headers) => {
    const copy = new Headers()
    headers.forEach((value, name) => {
      if (HOP_BY_HOP.has(name)) return
      if (name === 'location') return copy.set(name, toVisitor(value))
      if (name === 'set-cookie') return copy.append(name, value.replace(/;\s*domain=[^;]*/gi, ''))
      copy.append(name, value)
    })
    return copy
  }

  const redeem = (url: URL) => {
    const pass = passes.redeem(url.searchParams.get(TICKET_PARAM) ?? '', upstream.port)
    if (!pass) return plainText('This link has expired or was already used. Open the server again from sand.', 403)
    return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': `${cookie}=${pass}; Path=/; HttpOnly; SameSite=Lax` } })
  }

  const admitted = (request: Request) => passes.admits(cookiesOf(request.headers.get('cookie')).get(cookie) ?? '', upstream.port)

  const forward = async (request: Request, url: URL) => {
    try {
      const response = await fetch(new URL(url.pathname + url.search, origin), {
        method: request.method,
        headers: upstreamHeaders(request, url.origin),
        body: BODILESS.has(request.method) ? undefined : request.body,
        redirect: 'manual',
        decompress: false,
        signal: request.signal,
      })
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: visitorHeaders(response.headers) })
    } catch {
      return plainText(`The dev server on port ${upstream.port} isn't answering.`, 502)
    }
  }

  const bridge = async (request: Request, url: URL, server: Server<Bridge>) => {
    const protocols = (request.headers.get('sec-websocket-protocol') ?? '')
      .split(',')
      .map(protocol => protocol.trim())
      .filter(Boolean)
    const target = new URL(url.pathname + url.search, origin.replace(/^http/, 'ws'))
    const socket = await upstreamSocket(target, protocols)
    if (!socket) return plainText(`The dev server on port ${upstream.port} refused the connection.`, 502)
    const headers = socket.protocol ? { 'sec-websocket-protocol': socket.protocol } : undefined
    if (server.upgrade(request, { data: bridgeOf(socket), headers })) return undefined
    socket.close(SOCKET_CLOSE_OK)
    return plainText('expected a websocket', 400)
  }

  const respond = (request: Request, server: Server<Bridge>) => {
    const url = new URL(request.url)
    if (url.pathname === OPEN_PATH) return redeem(url)
    if (!admitted(request)) return plainText('Open this dev server from sand on one of your paired devices.', 401)
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') return bridge(request, url, server)
    return forward(request, url)
  }

  const server = firstListening(hostnames, hostname =>
    Bun.serve<Bridge>({
      hostname,
      port: 0,
      ipv6Only: false,
      fetch: respond,
      websocket: {
        open: visitor => visitor.data.attach(visitor),
        message: (visitor, message) => visitor.data.send(message),
        close: (visitor, code, reason) => visitor.data.close(code, reason),
      },
    }),
  )
  const port = server.port ?? 0

  return {
    port,
    upstream,
    link: (host: string, ticket: string) => `http://${host.includes(':') ? `[${host}]` : host}:${port}${OPEN_PATH}?${TICKET_PARAM}=${encodeURIComponent(ticket)}`,
    stop: () => server.stop(true),
  }
}

export type Proxy = ReturnType<typeof createProxy>
