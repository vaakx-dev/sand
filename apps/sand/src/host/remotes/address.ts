import { isLoopbackHost, routeKind } from '@sand/kit'

const hostOf = (address: string) => {
  const host = address.replace(/^::ffff:/i, '')
  return host.includes(':') ? `[${host}]` : host
}

const portOf = (urls: string[]) => {
  for (const url of urls) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' && parsed.port) return parsed.port
    } catch {}
  }
}

export const peerUrls = (address: string | undefined, urls: string[]) => {
  const local = !!address && isLoopbackHost(hostOf(address))
  const port = portOf(urls)
  const seen = address && port ? [`http://${hostOf(address)}:${port}`] : []
  return [...new Set([...seen, ...urls.filter(url => local || routeKind(url) !== 'local')])]
}
