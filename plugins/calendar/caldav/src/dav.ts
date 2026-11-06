import { childOf, childrenOf, dav, type Element, namespaces, parseXml, textOf } from './xml'

export interface Login {
  server: string
  username: string
  password: string
}

export interface Member {
  href: URL
  status?: number
  props: Element
}

export interface Multistatus {
  url: URL
  root: Element
  members: Member[]
}

export class DavError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly condition?: string,
  ) {
    super(message)
  }
}

interface Call {
  method: string
  headers?: Record<string, string>
  body?: string
  signal: AbortSignal
}

const explained: Record<number, string> = {
  401: 'The server turned down the username or password',
  403: "The server doesn't allow that",
  412: 'The event changed on the server meanwhile; try again after the next sync',
}

const statusOf = (line: string | undefined) => Number(line?.split(' ')[1]) || undefined

const succeeded = (status: number | undefined) => status !== undefined && status >= 200 && status < 300

const memberOf = (base: URL) => (response: Element): Member => {
  const stats = childrenOf(response, dav('propstat')).filter(stat => succeeded(statusOf(textOf(stat, dav('status')))))
  const status = statusOf(textOf(response, dav('status')))
  return {
    href: new URL(textOf(response, dav('href')) ?? '', base),
    ...(status && { status }),
    props: { name: dav('prop'), attributes: {}, text: '', children: stats.flatMap(stat => childOf(stat, dav('prop'))?.children ?? []) },
  }
}

const failure = async (call: Call, url: URL, response: Response) => {
  const error = parseXml(await response.text())
  const condition = error?.name === dav('error') ? error.children[0]?.name : undefined
  return new DavError(explained[response.status] ?? `${call.method} ${url.pathname} answered ${response.status}`, response.status, condition)
}

const xml = (body: string) => `<?xml version="1.0" encoding="utf-8"?>${body}`

export const davClient = (login: Login) => {
  const authorization = `Basic ${Buffer.from(`${login.username}:${login.password}`).toString('base64')}`

  const send = async (url: URL, call: Call, hops = 0): Promise<{ response: Response; url: URL }> => {
    const response = await fetch(url, { method: call.method, headers: { authorization, ...call.headers }, body: call.body, signal: call.signal, redirect: 'manual' })
    const location = response.headers.get('location')
    if (!location || response.status < 300 || response.status >= 400) return { response, url }
    const next = new URL(location, url)
    if (hops === 5 || (url.protocol === 'https:' && next.protocol !== 'https:')) throw new Error(`${url.host} sent sand on to ${next.host}, which it won't follow`)
    return send(next, call, hops + 1)
  }

  const checked = async (url: URL, call: Call) => {
    const reply = await send(url, call)
    if (!reply.response.ok) throw await failure(call, reply.url, reply.response)
    return reply
  }

  const multistatus = async (url: URL, method: string, depth: number, body: string, signal: AbortSignal): Promise<Multistatus> => {
    const reply = await checked(url, { method, headers: { depth: String(depth), 'content-type': 'application/xml; charset=utf-8' }, body: xml(body), signal })
    const root = parseXml(await reply.response.text())
    if (root?.name !== dav('multistatus')) throw new Error(`${method} ${reply.url.pathname} didn't answer with a WebDAV multistatus`)
    return { url: reply.url, root, members: childrenOf(root, dav('response')).map(memberOf(reply.url)) }
  }

  return {
    propfind: (url: URL, depth: number, props: string, signal: AbortSignal) =>
      multistatus(url, 'PROPFIND', depth, `<d:propfind ${namespaces}><d:prop>${props}</d:prop></d:propfind>`, signal),
    report: (url: URL, body: string, signal: AbortSignal) => multistatus(url, 'REPORT', 1, body, signal),
    async options(url: URL, signal: AbortSignal) {
      const { response } = await checked(url, { method: 'OPTIONS', signal })
      return (response.headers.get('dav') ?? '').split(',').map(part => part.trim())
    },
    async get(url: URL, signal: AbortSignal) {
      const { response } = await checked(url, { method: 'GET', signal })
      return { ics: await response.text(), etag: response.headers.get('etag') ?? undefined }
    },
    async put(url: URL, ics: string, headers: Record<string, string>, signal: AbortSignal) {
      const { response } = await checked(url, { method: 'PUT', headers: { ...headers, 'content-type': 'text/calendar; charset=utf-8' }, body: ics, signal })
      return response.headers.get('etag') ?? undefined
    },
    async delete(url: URL, headers: Record<string, string>, signal: AbortSignal) {
      await checked(url, { method: 'DELETE', headers, signal })
    },
  }
}

export type DavClient = ReturnType<typeof davClient>
