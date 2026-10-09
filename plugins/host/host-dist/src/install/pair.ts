import type { HttpCall, HttpRoute } from '@sand/host-gateway/contract'
import type { HostRemotes } from '@sand/host-remotes/contract'
import { errorMessage, pairLink, parsePairLink, routeKind } from '@sand/kit'
import type { InstallPairRequest, InstallPairResult } from '../contract'
import type { InstallKeys } from '../installs'
import { expired, installSecret, readText, text } from './base'

const limit = 16 * 1024

export interface PairRouteDeps {
  installs: Pick<InstallKeys, 'check' | 'step'>
  remotes: Pick<HostRemotes, 'add'>
  id: string
  name: string
}

const pairRequest = (body: string | undefined): InstallPairRequest | undefined => {
  if (body === undefined) return
  try {
    const { name, links } = JSON.parse(body) as Record<string, unknown>
    if (typeof name !== 'string' || !name.trim() || !Array.isArray(links) || !links.length) return
    if (!links.every(link => typeof link === 'string')) return
    return { name: name.trim(), links }
  } catch {
    return
  }
}

const peerHost = (address: string) => {
  const host = address.replace(/^::ffff:/i, '')
  return host.includes(':') ? `[${host}]` : host
}

const peerLink = ({ address }: HttpCall, link: string) => {
  const parsed = parsePairLink(link)
  if (!address || !parsed) return
  const port = new URL(parsed.url).port
  return pairLink(`http://${peerHost(address)}${port ? `:${port}` : ''}`, parsed.secret)
}

const reachable = (link: string) => {
  const parsed = parsePairLink(link)
  return Boolean(parsed && routeKind(parsed.url) !== 'local')
}

const candidates = (call: HttpCall, links: string[]) => {
  const peer = peerLink(call, links[0] ?? '')
  return [...new Set([...(peer ? [peer] : []), ...links])].filter(reachable)
}

const pairBack = async (remotes: PairRouteDeps['remotes'], links: string[]) => {
  let last = 'it sent no reachable address'
  for (const link of links) {
    try {
      await remotes.add(link)
      return
    } catch (error) {
      last = errorMessage(error)
    }
  }
  return last
}

export const pairRoute = ({ installs, remotes, id, name }: PairRouteDeps): HttpRoute => ({
  method: 'POST',
  async handle(call) {
    const secret = installSecret(call)
    if (!secret || !installs.check(secret)) return expired()
    const request = pairRequest(await readText(call.request, limit))
    if (!request) return text('expected {name, links} as JSON', 400)
    installs.step(secret, 'pairing', { name: request.name })
    const failure = await pairBack(remotes, candidates(call, request.links))
    if (failure !== undefined) return text(`Could not pair with ${request.name}: ${failure}`, 502)
    const result: InstallPairResult = { id, name }
    installs.step(secret, 'checking')
    return Response.json(result, { headers: { 'cache-control': 'no-store' } })
  },
})
