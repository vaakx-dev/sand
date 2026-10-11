import type { HostIdentity, RouteKind } from '@sand/host-gateway/contract'
import { errorMessage, fetchHostIdentity, routeKind, routeRank } from '@sand/kit'
import { after } from '../detached'
import { failed, succeeded } from './book'
import { latencySlack } from './rank'
import { hostOf } from './url'

export interface Route {
  url: string
  kind: RouteKind
  latency: number
  identity: HostIdentity
}

const probeTimeout = 4000
const settle = 250
const unreachable = 'No known way to reach this PC'

const probe = async (url: string): Promise<Route> => {
  const start = performance.now()
  const identity = await fetchHostIdentity(url, probeTimeout)
  return { url, kind: routeKind(url), latency: performance.now() - start, identity }
}

const pick = (results: Route[], urls: string[], expected: string | undefined, trusted: string | undefined) => {
  const id = results.find(route => route.url === trusted)?.identity.deviceId ?? expected ?? results[0]?.identity.deviceId
  const pool = results.filter(route => route.identity.deviceId === id)
  const fastest = Math.min(...pool.map(route => route.latency))
  return pool
    .filter(route => route.latency <= fastest + latencySlack)
    .sort((a, b) => routeRank(a.kind) - routeRank(b.kind) || urls.indexOf(a.url) - urls.indexOf(b.url))[0]
}

export const selectRoute = (urls: string[], expected: string | undefined, trusted?: string) =>
  new Promise<Route>((resolve, reject) => {
    const list = expected === undefined ? urls.slice(0, 1) : urls
    const first = list[0]
    if (!first) return reject(new Error(unreachable))
    const accepts = (route: Route) => expected === undefined || route.identity.deviceId === expected || route.url === trusted
    const results: Route[] = []
    let lastError: Error | undefined
    let waiting = list.length
    let settling: (() => void) | undefined
    let done = false

    const finish = () => {
      if (done) return
      done = true
      settling?.()
      const best = pick(results, list, expected, trusted ?? (expected === undefined ? first : undefined))
      if (best) resolve(best)
      else reject(lastError ?? new Error(unreachable))
    }

    const miss = (url: string, error: Error) => {
      lastError = error
      if (expected) failed(expected, url)
    }

    const reached = (route: Route) => {
      if (!accepts(route)) return miss(route.url, new Error(`reached a different PC at ${route.url}`))
      succeeded(route.identity.deviceId, route.url, route.latency)
      if (done) return
      results.push(route)
      settling ??= after(settle, finish)
    }

    for (const url of list)
      probe(url)
        .then(reached, error => miss(url, new Error(`Could not reach ${hostOf(url)}: ${errorMessage(error)}`)))
        .finally(() => {
          if (--waiting === 0) finish()
        })
  })
