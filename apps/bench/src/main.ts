import { join } from 'node:path'
import { parseArgs } from 'node:util'
import type { Page } from 'playwright'
import { listMissing, missingFrom } from './complete'
import { slowLink, type LinkShape } from './link'
import { type Cost, costOf, countAt, fresh, openRoute, seen, shownAt, tapped } from './measure'
import { startPhone } from './phone'
import { startSandbox } from './sandbox'
import type { SeededChat } from './seed'

const { values } = parseArgs({
  options: {
    runs: { type: 'string', default: '5' },
    cpu: { type: 'string', default: '4' },
    rtt: { type: 'string', default: '150' },
    down: { type: 'string', default: '9000' },
    up: { type: 'string', default: '1500' },
    idle: { type: 'string', default: '20000' },
    out: { type: 'string' },
    profile: { type: 'string' },
    box: { type: 'string' },
    keep: { type: 'boolean', default: false },
    trace: { type: 'boolean', default: false },
  },
})

const runs = Number(values.runs)
const shape: LinkShape = { rttMs: Number(values.rtt), downKbps: Number(values.down), upKbps: Number(values.up) }
const local: LinkShape = { rttMs: 0, downKbps: 10_000_000, upKbps: 10_000_000 }
const results = new Map<string, Cost[]>()
const problems: string[] = []
const checkComplete = async (page: Page, ...chats: SeededChat[]) => {
  for (const chat of chats) problems.push(...(await missingFrom(page, sandbox.box, chat.id)))
}
const record = (name: string, cost: Cost) => {
  console.error(`${name}: ${Math.round(cost.ms)} ms`)
  results.set(name, [...(results.get(name) ?? []), cost])
}

const sandbox = await startSandbox(runs * 4 + 10, values.box, values.keep)
const target = new URL(sandbox.pairUrl)
const link = await slowLink(target, shape)
const phone = await startPhone({ cpuSlowdown: Number(values.cpu) })
const at = (path: string) => `${link.origin}${path}`
const threadUrl = (chat: SeededChat) => at(`/?view=thread&id=${chat.id}`)

const short = sandbox.seeded.threads.filter(chat => !chat.long)
const long = sandbox.seeded.threads.filter(chat => chat.long)
const home = short[0]!
const warm = short.at(-1)!


const measured = async (page: Page, name: string, act: () => Promise<number>, done: (start: number) => Promise<number>) => {
  const since = await seen(page, link.traffic)
  const [start, end] = await profiled(page, name, async () => {
    const start = await act()
    return [start, await done(start)] as const
  })
  record(name, await costOf(page, link.traffic, since, start, end))
}

const open = (page: Page, name: string, chat: SeededChat, kind = 'thread') =>
  measured(
    page,
    name,
    () => openRoute(page, kind, chat.id),
    () => shownAt(page, `End-${chat.marker}`, true),
  )

const tap = async (page: Page, name: string) => {
  await page.getByRole('button', { name, exact: true }).first().click()
  return tapped(page)
}

const traced = async <T>(page: Page, name: string, act: () => Promise<T>) => {
  const cdp = phone.cdp(page)
  const events: unknown[] = []
  const collect = ({ value }: { value: unknown[] }) => void events.push(...value)
  cdp.on('Tracing.dataCollected', collect)
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'v8.execute', 'v8', 'blink', 'loading', 'disabled-by-default-devtools.timeline', 'disabled-by-default-v8.compile'] }, transferMode: 'ReportEvents' })
  const result = await act()
  const done = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve))
  await cdp.send('Tracing.end')
  await done
  cdp.off('Tracing.dataCollected', collect)
  await Bun.write(join(values.profile!, `${name.replace(/[^a-z]+/gi, '-')}.trace.json`), JSON.stringify({ traceEvents: events }))
  return result
}

const profiled = async <T>(page: Page, name: string, act: () => Promise<T>) => {
  if (!values.profile) return act()
  if (values.trace) return traced(page, name, act)
  const cdp = phone.cdp(page)
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
  await cdp.send('Profiler.start')
  const result = await act()
  const { profile } = await cdp.send('Profiler.stop')
  await Bun.write(join(values.profile, `${name.replace(/[^a-z]+/gi, '-')}.cpuprofile`), JSON.stringify(profile))
  return result
}

const coldLoad = async (page: Page, name: string, chat: SeededChat) => {
  await page.goto(at('/favicon.ico'))
  const since = fresh(link.traffic)
  let shown = 0
  const end = await profiled(page, name, async () => {
    await page.goto(threadUrl(chat), { waitUntil: 'commit' })
    shown = await shownAt(page, `End-${chat.marker}`)
    return shownAt(page, `End-${chat.marker}`, true)
  })
  const cost = await costOf(page, link.traffic, since, 0, end)
  if (name.endsWith('is usable')) record(name.replace('is usable', 'shows'), { ...cost, ms: shown })
  record(name, cost)
}

const screens = 60

const scrollUp = (page: Page, chat: SeededChat) =>
  measured(
    page,
    `scroll a long chat up ${screens} screens`,
    () => page.evaluate(() => performance.now()),
    () =>
      page.evaluate(
        async ([end, count]) => {
          const scroller = window.bench.scroller(end)
          const frame = () => new Promise(resolve => requestAnimationFrame(resolve))
          for (let step = 0; step < count; step++) {
            scroller.scrollTop -= scroller.clientHeight
            await frame()
            await frame()
          }
          return performance.now()
        },
        [`End-${chat.marker}`, screens] as const,
      ),
  )

const send = async (page: Page, run: number) => {
  const text = `Bench message ${run}`
  await page.locator('[contenteditable=true],textarea').first().fill(text)
  const before = await page.evaluate(() => window.bench.count('Bench reply'))
  const since = await seen(page, link.traffic)
  const start = await tap(page, 'Send')
  const shown = await shownAt(page, text)
  const replied = await countAt(page, 'Bench reply', before)
  const cost = await costOf(page, link.traffic, since, start, replied)
  record('send: message shows', { ...cost, ms: shown - start })
  record('send: first reply text shows', cost)
}

const idle = async (page: Page) => {
  const since = await seen(page, link.traffic)
  const start = await page.evaluate(() => performance.now())
  await page.waitForTimeout(Number(values.idle))
  record(`idle ${Number(values.idle) / 1000} s`, await costOf(page, link.traffic, since, start, start + Number(values.idle)))
}

const pair = async () => {
  const page = await phone.page(1)
  await page.goto(`${link.origin}/${target.hash}`)
  await page.getByRole('button', { name: 'Show the sidebar' }).first().waitFor({ timeout: 60_000 })
  for (const chat of [home, warm]) {
    await page.goto(threadUrl(chat))
    await shownAt(page, `End-${chat.marker}`, true)
  }
  await page.waitForTimeout(5000)
  await page.close()
}

const run = async (index: number) => {
  const unseen = short[1 + index * 2]!
  const other = short[2 + index * 2]!
  const before = index === 0 ? warm : short[1 + (index - 1) * 2]!
  const page = await phone.page()
  await coldLoad(page, 'cold load until the chat is usable', home)
  await open(page, 'open a chat the device has not seen', unseen)
  await open(page, 'open a chat the device has not seen', other)
  await open(page, 'switch between chats', unseen)
  await open(page, 'switch between chats', other)
  await open(page, 'open a chat seen in an earlier visit', before)
  const longChat = long[index % long.length]!
  await open(page, 'open a long chat', longChat)
  await scrollUp(page, longChat)
  await open(page, 'switch between chats', other)
  await send(page, index)
  await measured(
    page,
    'open the sidebar thread list',
    () => tap(page, 'Show the sidebar'),
    () => shownAt(page, other.title),
  )
  await measured(
    page,
    'open Settings',
    () => tap(page, 'Settings'),
    () => shownAt(page, 'Add-ons'),
  )
  await page.keyboard.press('Escape')
  await checkComplete(page, home, unseen, other, before, longChat)
  problems.push(...(await listMissing(page, sandbox.box)))
  await idle(page)
  await page.close()
}

const serverSide = async () => {
  Object.assign(shape, local)
  const page = await phone.page(1)
  await coldLoad(page, 'server: cold load', home)
  for (const chat of short.slice(-6, -2)) {
    await open(page, 'server: open a chat the device has not seen', chat)
  }
  const calls = await page.evaluate(() => window.bench.calls)
  await page.close()
  const byType = new Map<string, number[]>()
  for (const call of calls) byType.set(call.type, [...(byType.get(call.type) ?? []), call.end - call.start])
  return [...byType].map(([type, times]) => ({ type, count: times.length, medianMs: median(times), maxMs: Math.max(...times) })).toSorted((a, b) => b.maxMs - a.maxMs)
}

const median = (numbers: number[]) => {
  const sorted = numbers.toSorted((a, b) => a - b)
  const middle = sorted.length >> 1
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

const kb = (bytes: number) => (bytes / 1024).toFixed(1)

try {
  console.error(`sandbox ready at ${target.origin} in ${sandbox.box}, pairing`)
  await pair()
  for (let index = 0; index < runs; index++) {
    await run(index)
    console.error(`run ${index + 1} of ${runs} done`)
  }
  const server = await serverSide()
  const summary = [...results].map(([name, costs]) => ({
    name,
    ms: Math.round(median(costs.map(cost => cost.ms))),
    requests: median(costs.map(cost => cost.requests)),
    roundTrips: median(costs.map(cost => cost.roundTrips)),
    wireDownKb: kb(median(costs.map(cost => cost.wireDown))),
    wireUpKb: kb(median(costs.map(cost => cost.wireUp))),
    plainDownKb: kb(median(costs.map(cost => cost.plainDown))),
    pushes: median(costs.map(cost => cost.pushes)),
    pushKb: kb(median(costs.map(cost => cost.pushBytes))),
    blockedMs: Math.round(median(costs.map(cost => cost.blockedMs))),
    calls: costs.at(-1)!.calls,
  }))
  console.table(summary.map(({ calls: _, ...row }) => row))
  console.table(server.slice(0, 15))
  for (const problem of problems) console.error(`incomplete: ${problem}`)
  if (problems.length) process.exitCode = 1
  else console.error('every chat the page loaded matches the PC entry for entry')
  if (values.out) await Bun.write(values.out, JSON.stringify({ shape, cpu: values.cpu, runs, summary, server, raw: Object.fromEntries(results) }, null, 2))
} finally {
  await phone.close()
  link.close()
  await sandbox.stop()
}
