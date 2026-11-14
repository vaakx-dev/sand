import type { Page } from 'playwright'
import type { Traffic } from './link'
import type { WireCall, WireEvent } from './phone'

export interface Cost {
  ms: number
  requests: number
  roundTrips: number
  wireDown: number
  wireUp: number
  plainDown: number
  plainUp: number
  pushes: number
  pushBytes: number
  calls: Record<string, number>
  blockedMs: number
  timeline: string[]
}

interface Resource {
  start: number
  end: number
  transfer: number
  decoded: number
}

interface Seen {
  calls: number
  events: number
  resources: number
  up: number
  down: number
}

const timeout = 90_000
const settleMs = 1500

export const seen = async (page: Page, traffic: Traffic): Promise<Seen> => ({
  ...(await page.evaluate(() => ({ calls: window.bench.calls.length, events: window.bench.events.length, resources: performance.getEntriesByType('resource').length }))),
  up: traffic.up,
  down: traffic.down,
})

export const fresh = (traffic: Traffic): Seen => ({ calls: 0, events: 0, resources: 0, up: traffic.up, down: traffic.down })

const waves = (spans: { start: number; end: number }[]) => {
  let count = 0
  let reach = -Infinity
  for (const { start, end } of spans.toSorted((a, b) => a.start - b.start)) {
    if (start >= reach) count++
    reach = Math.max(reach, end)
  }
  return count
}

export const costOf = async (page: Page, traffic: Traffic, since: Seen, start: number, end: number): Promise<Cost> => {
  await page.waitForTimeout(settleMs)
  const { calls, events, resources, blocked } = await page.evaluate(
    ({ from, since: begin, until }) => ({
      blocked: window.bench.longTasks.filter(task => task.start >= begin && task.start <= until).reduce((sum, task) => sum + task.ms, 0),
      calls: window.bench.calls.slice(from.calls).filter(call => call.start <= until),
      events: window.bench.events.slice(from.events),
      resources: performance
        .getEntriesByType('resource')
        .slice(from.resources)
        .filter(entry => entry.startTime <= until)
        .map(entry => {
          const resource = entry as PerformanceResourceTiming
          return { name: resource.name, start: resource.startTime, end: resource.responseEnd, transfer: resource.transferSize, decoded: resource.decodedBodySize }
        }),
    }),
    { from: since, since: start, until: end },
  )
  const called = (calls as WireCall[]).reduce<Record<string, number>>((all, call) => ({ ...all, [call.type]: (all[call.type] ?? 0) + 1 }), {})
  return {
    ms: end - start,
    requests: calls.length + resources.length,
    roundTrips: waves([...(calls as WireCall[]), ...(resources as Resource[])]),
    wireDown: traffic.down - since.down,
    wireUp: traffic.up - since.up,
    plainDown: (calls as WireCall[]).reduce((sum, call) => sum + call.received, 0) + (resources as Resource[]).reduce((sum, resource) => sum + resource.decoded, 0),
    plainUp: (calls as WireCall[]).reduce((sum, call) => sum + call.sent, 0),
    pushes: events.length,
    pushBytes: (events as WireEvent[]).reduce((sum, event) => sum + event.bytes, 0),
    calls: called,
    blockedMs: blocked,
    timeline: [...(calls as WireCall[]).map(call => ({ start: call.start, end: call.end, text: `${call.type} ${call.received} B` })), ...(resources as (Resource & { name: string })[]).map(resource => ({ start: resource.start, end: resource.end, text: `${new URL(resource.name).pathname} ${resource.transfer}/${resource.decoded} B` }))]
      .toSorted((a, b) => a.start - b.start)
      .map(({ start: from, end: to, text }) => `${Math.round(from - start)}-${Math.round(to - start)} ${text}`),
  }
}

export const shownAt = async (page: Page, text: string, composer = false) => {
  const handle = await page.waitForFunction(
    ([wanted, needsComposer]) => (window.bench.visible(wanted) && (!needsComposer || window.bench.composer()) ? performance.now() : 0),
    [text, composer] as const,
    { polling: 'raf', timeout },
  )
  return (await handle.jsonValue()) as number
}

export const countAt = async (page: Page, text: string, above: number) => {
  const handle = await page.waitForFunction(([wanted, count]) => (window.bench.count(wanted) > count ? performance.now() : 0), [text, above] as const, { polling: 'raf', timeout })
  return (await handle.jsonValue()) as number
}

export const openRoute = (page: Page, kind: string, id: string) =>
  page.evaluate(
    ([routeKind, routeId]) => {
      const start = performance.now()
      const app = (window as unknown as { sand: { get(token: { id: string }): { open(route: { kind: string; id: string }): void } } }).sand
      app.get({ id: 'shell' }).open({ kind: routeKind, id: routeId })
      return start
    },
    [kind, id] as const,
  )

export const tapped = (page: Page) => page.evaluate(() => window.bench.tap)

