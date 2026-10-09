import type { RouteKind } from '@sand/protocol'
import { errorMessage, routeKind, routeRank } from '@sand/kit'
import { failed, succeeded } from './book'
import { probe, type Probe } from './probe'

export interface Route extends Probe {
  kind: RouteKind
}

const probeTimeout = 4000
const settle = 250
export const latencySlack = 20

const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
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
    if (!first) return reject(new Error('No known way to reach this PC'))
    const accepts = (route: Route) => expected === undefined || route.identity.deviceId === expected || route.url === trusted
    const results: Route[] = []
    let lastError: Error | undefined
    let waiting = list.length
    let timer: ReturnType<typeof setTimeout> | undefined
    let done = false

    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      const best = pick(results, list, expected, trusted ?? (expected === undefined ? first : undefined))
      if (best) resolve(best)
      else reject(lastError ?? new Error('No known way to reach this PC'))
    }

    const miss = (url: string, error: Error) => {
      lastError = error
      if (expected) failed(expected, url)
    }

    for (const url of list)
      probe(url, probeTimeout)
        .then(
          result => {
            const route = { ...result, kind: routeKind(url) }
            if (!accepts(route)) return miss(url, new Error(`reached a different PC at ${url}`))
            succeeded(route.identity.deviceId, url, route.latency)
            if (done) return
            results.push(route)
            timer ??= setTimeout(finish, settle)
          },
          error => miss(url, new Error(`Could not reach ${hostOf(url)}: ${errorMessage(error)}`)),
        )
        .finally(() => {
          if (--waiting === 0) finish()
        })
  })
