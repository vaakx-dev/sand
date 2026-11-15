import { textOf, type Session } from '@sand/chats/contract'
import { startSand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { devServerList, devServerStop } from '../src/contract'

const FOUND_WITHIN_MS = 20_000
const COLD_START_LISTED_MS = 6_000

let sand: Awaited<ReturnType<typeof startSand>>

afterEach(() => sand.stop())

const servers = `
const [page, raw] = process.argv.slice(2).map(Number)
Bun.serve({ port: page, fetch: () => new Response('<!doctype html><title>Tide tables</title>', { headers: { 'content-type': 'text/html' } }) })
Bun.listen({ hostname: '127.0.0.1', port: raw, socket: { data() {} } })
`

const site = `
Bun.serve({ port: Number(process.argv[2]), fetch: () => new Response('<!doctype html><title>Tide tables</title>', { headers: { 'content-type': 'text/html' } }) })
`

const coldSite = `
let first = true
Bun.serve({
  port: Number(process.argv[2]),
  async fetch() {
    const cold = first
    first = false
    if (cold) await Bun.sleep(4_000)
    return new Response('<!doctype html><title>Tide tables</title>', { headers: { 'content-type': 'text/html' } })
  },
})
`

const launcher = `
const child = Bun.spawn([process.execPath, ...process.argv.slice(2)], { stdio: ['ignore', 'inherit', 'inherit'] })
process.exit(await child.exited)
`

const unixPath = (path: string) => path.replaceAll('\\', '/')

const freePort = () => {
  const probe = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } })
  const { port } = probe
  probe.stop(true)
  return port
}

const shell = async (session: Session, command: string) => {
  const call = { type: 'tool_call', id: `shell-${Bun.randomUUIDv7()}`, name: 'shell', input: { command } } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress: () => {}, wait: () => () => {} })
  return textOf(result.content)
}

const listedWithin = async (session: Session, until: (ports: number[]) => boolean) => {
  const deadline = Date.now() + FOUND_WITHIN_MS
  for (;;) {
    const ports = (await sand.ask(devServerList, { session: session.id })).map(server => server.port)
    if (until(ports) || Date.now() > deadline) return ports
    await Bun.sleep(100)
  }
}

const answers = (port: number) =>
  fetch(`http://localhost:${port}/`).then(
    () => true,
    () => false,
  )

test("a web server a shell call leaves running is listed for its thread until Stop ends it, and a non-web listener isn't", async () => {
  sand = await startSand([{ id: 'replay', models: ['m'], replies: [], api: 'anthropic' }], {
    plugins: ['core/watch', 'agent/processes', 'agent/shell', 'agent/dev-servers'],
    options: { 'dev-servers': { every_ms: 100 } },
  })
  const thread = sand.chat('replay/m')
  const other = sand.chat('replay/m')
  const script = join(sand.home, 'servers.ts')
  await Bun.write(script, servers)
  const [page, raw] = [freePort(), freePort()]

  await shell(thread, `"${process.execPath.replaceAll('\\', '/')}" "${script.replaceAll('\\', '/')}" ${page} ${raw} > /dev/null 2>&1 &`)

  expect(await listedWithin(thread, ports => ports.includes(page))).toEqual([page])
  expect(await sand.ask(devServerList, { session: other.id })).toEqual([])

  expect(await sand.ask(devServerStop, { port: page })).toBe(true)

  expect(await listedWithin(thread, ports => ports.length === 0)).toEqual([])
  expect(await answers(page)).toBe(false)
})

test("a server a thread starts through launchers is listed with its thread for anyone who doesn't name one", async () => {
  sand = await startSand([{ id: 'replay', models: ['m'], replies: [], api: 'anthropic' }], {
    plugins: ['core/watch', 'agent/processes', 'agent/shell', 'agent/dev-servers'],
    options: { 'dev-servers': { every_ms: 100 } },
  })
  const thread = sand.chat('replay/m')
  const bot = sand.chat('replay/m')
  const [script, launch] = ['site.ts', 'launcher.ts'].map(name => unixPath(join(sand.home, name)))
  await Promise.all([Bun.write(script!, site), Bun.write(launch!, launcher)])
  const page = freePort()

  await shell(thread, `"${unixPath(process.execPath)}" "${launch}" "${launch}" "${script}" ${page} > /dev/null 2>&1 &`)
  const askingBot = sand.askAs({ device: 'sand', kind: 'agent', actor: { owner: 'bot', id: bot.id } })

  expect(await listedWithin(thread, ports => ports.includes(page))).toEqual([page])
  expect(await askingBot(devServerList, {})).toMatchObject([{ port: page, session: thread.id }])
  expect(await askingBot(devServerList, { session: bot.id })).toEqual([])

  expect(await sand.ask(devServerStop, { port: page })).toBe(true)
  expect(await answers(page)).toBe(false)
})

test('a server whose first page is slow to build is listed once it answers, without waiting out the miss', async () => {
  sand = await startSand([{ id: 'replay', models: ['m'], replies: [], api: 'anthropic' }], {
    plugins: ['core/watch', 'agent/processes', 'agent/shell', 'agent/dev-servers'],
    options: { 'dev-servers': { every_ms: 100 } },
  })
  const thread = sand.chat('replay/m')
  const script = unixPath(join(sand.home, 'cold.ts'))
  await Bun.write(script, coldSite)
  const page = freePort()
  const started = Date.now()

  await shell(thread, `"${unixPath(process.execPath)}" "${script}" ${page} > /dev/null 2>&1 &`)

  expect(await listedWithin(thread, ports => ports.includes(page))).toEqual([page])
  expect(Date.now() - started).toBeLessThan(COLD_START_LISTED_MS)
  expect(await sand.ask(devServerStop, { port: page })).toBe(true)
})
