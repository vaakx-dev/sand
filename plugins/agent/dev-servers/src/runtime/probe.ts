const PROBE_TIMEOUT_MS = 2_000
const REDIRECTS = new Set([301, 302, 303, 307, 308])
const EMPTY = new Set([204, 205])
const PAGE_TYPE = /^\s*(text\/html|application\/xhtml\+xml)/i
const IPV4_HOSTS = new Set(['0.0.0.0', '127.0.0.1'])
const IPV6_HOSTS = new Set(['::', '::1'])

const loopbackOf = (host: string) => {
  if (IPV4_HOSTS.has(host)) return '127.0.0.1'
  if (IPV6_HOSTS.has(host)) return '[::1]'
  return undefined
}

const pageLike = (response: Response) => {
  if (REDIRECTS.has(response.status)) return response.headers.has('location')
  return response.ok && !EMPTY.has(response.status) && PAGE_TYPE.test(response.headers.get('content-type') ?? '')
}

const servesPages = async (address: string, port: number) => {
  try {
    const response = await fetch(`http://${address}:${port}/`, { redirect: 'manual', headers: { accept: 'text/html' }, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
    void response.body?.cancel()
    return pageLike(response)
  } catch {
    return false
  }
}

export { loopbackOf, servesPages }
