import type { RouteCaller } from '@sand/host-gateway/contract'
import { type Peers as PcLinks, peers as pcLinks } from '@sand/devices-contract'
import { startSand, type Sand } from '@sand/harness'
import { media } from '@sand/media/contract'
import type { RouteHandler, Server } from '@sand/server/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAccounts } from '../src/auth/accounts'
import { createPlans } from '../src/auth/plans'
import { viewOf } from '../src/catalog/view'
import { llm, type LLMEvent, type LLMRequest, type NativeRef, type Plan, type ProviderCapabilities, statelessCaps, ThreadLost } from '../src/contract'
import type { LocalLLM } from '../src/local'
import { sharePaths } from '../src/share/info'
import { serveShare } from '../src/share/routes'
import { createUsers } from '../src/share/users'

type Reply = LLMEvent[] | Error | 'hold'

interface AccountPc {
  answer: RouteHandler
  asked: LLMRequest[]
  stopped: () => boolean
}

const homes: string[] = []
let sand: Sand

afterEach(async () => {
  await sand.stop()
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

const nativeCaps: ProviderCapabilities = { ...statelessCaps([], 3_600_000), native: true, resume: true, steer: true }

const caller: RouteCaller = { device: 'chat-pc', name: 'Chat PC', kind: 'pc' }

const plan: Plan = {
  id: 'remote',
  label: 'Remote',
  name: 'Remote',
  detail: '',
  logo: 'remote',
  api: 'anthropic',
  signIn: () => Promise.reject(new Error('unused')),
  refresh: async tokens => tokens,
  call: () => {
    throw new Error('unused')
  },
  models: async () => [],
}

const reply = (text: string, native?: NativeRef): LLMEvent[] => [
  { type: 'start', model: 'remote/m' },
  { type: 'text', index: 0, text },
  {
    type: 'done',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
    stopReason: 'end_turn',
    usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
    ...(native && { native, delivered: 'inline' }),
  },
]

const accountPc = async (caps: ProviderCapabilities, replies: Reply[]): Promise<AccountPc> => {
  const home = mkdtempSync(join(tmpdir(), 'sand-account-pc-'))
  homes.push(home)
  await Bun.write(join(home, 'auth.json'), JSON.stringify({ remote: { type: 'oauth', access: 'a', refresh: 'r', expires: 8e15 } }))
  const plans = createPlans({ saved: {}, save: async () => {}, changed() {}, dropped() {} })
  plans.register(plan)
  const accounts = createAccounts(join(home, 'auth.json'), plans, () => {})
  await accounts.ready
  const view = viewOf(() => [
    {
      meta: { id: 'remote', kind: 'remote', label: 'Remote', provider: 'remote', billing: 'plan', caps },
      models: [{ id: 'remote/m', label: 'm', source: 'remote', name: 'm', efforts: [] }],
      newModels: 'show',
    },
  ])
  const asked: LLMRequest[] = []
  let stopped = false
  const local: LocalLLM = {
    view,
    models: view.models,
    levels: () => [],
    limits: () => undefined,
    allLimits: () => [],
    price: () => undefined,
    refreshLimits: async () => undefined,
    release() {},
    async *stream(request, signal) {
      asked.push(request)
      const next = replies.shift() ?? new Error('no reply left')
      if (next instanceof Error) throw next
      if (next !== 'hold') return yield* next
      yield { type: 'start', model: 'remote/m' }
      await new Promise(resolve => signal!.addEventListener('abort', resolve))
      stopped = true
    },
  }
  const routes = new Map<string, RouteHandler>()
  const server: Server = {
    handle: () => () => {},
    broadcast() {},
    hello: () => () => {},
    pages: () => 0,
    ask: () => Promise.reject(new Error('No requests in this test')),
    route(path, handler) {
      routes.set(path, handler)
      return () => void routes.delete(path)
    },
  }
  serveShare(server, { local, accounts, users: createUsers(new Map(), () => {}), media: sand.app.get(media)! })
  const answer: RouteHandler = (request, from) => routes.get(new URL(request.url).pathname)!(request, from)
  return { answer, asked, stopped: () => stopped }
}

const withoutCaps =
  (answer: RouteHandler): RouteHandler =>
  async (request, from) => {
    const response = await answer(request, from)
    if (new URL(request.url).pathname !== sharePaths.info) return response
    const info = await response.json()
    return Response.json({ ...info, accounts: info.accounts.map(({ caps: _, ...account }: { caps: unknown }) => account) })
  }

const linksTo = (pcs: Record<string, RouteHandler>, down: Set<string>, calls: string[]) => {
  const opened = new Set<(pc: string) => void>()
  const links: PcLinks = {
    list: () => Object.keys(pcs).map(id => ({ id, name: id, status: { phase: 'connecting', attempt: 0 }, routes: [], attempts: [] })),
    get: () => undefined,
    connected: () => Object.keys(pcs),
    call: () => Promise.reject(new Error('unused')),
    callEach: async () => [],
    async fetch(pc, path, init) {
      if (path === sharePaths.stream) {
        calls.push(pc)
        if (down.has(pc)) throw new Error('connection refused')
      }
      return pcs[pc]!(new Request(`http://${pc}${path}`, init), caller)
    },
    on: () => () => {},
    hello: () => undefined,
    directUrl: () => undefined,
    retry() {},
    onOpen(listener) {
      opened.add(listener)
      return () => void opened.delete(listener)
    },
    onChange: () => () => {},
  }
  sand.app.provide(pcLinks, links)
  return { reopen: (pc: string) => opened.forEach(listener => listener(pc)) }
}

const until = async (ready: () => boolean) => {
  while (!ready()) await Bun.sleep(5)
}

const borrowed = () => sand.app.get(llm)!.sources!().find(source => source.id === 'remote')

test('a borrowed native session gets its thread, delta and handoff, stays on the PC that holds it, and a lost session starts over anywhere', async () => {
  sand = await startSand([])
  const one = await accountPc(nativeCaps, [reply('fresh start')])
  const two = await accountPc(nativeCaps, [reply('first', { id: 'n1', cwd: '/far' }), reply('second', { id: 'n1', cwd: '/far' }), new ThreadLost('the app exited')])
  const down = new Set(['one'])
  const calls: string[] = []
  const links = linksTo({ one: one.answer, two: two.answer }, down, calls)
  await until(() => !!sand.app.get(llm)!.find!('remote/m'))
  expect(sand.app.get(llm)!.caps!('remote/m')).toEqual(nativeCaps)

  const chat = sand.chat('remote/m')
  const usage = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }
  chat.append('message', { role: 'user', content: [{ type: 'text', text: 'hello' }] })
  chat.append('message', { role: 'assistant', content: [{ type: 'text', text: 'hi' }] })
  chat.append('usage', { id: 'u1', model: 'other/m', usage })

  expect((await sand.turns.run(chat, 'go')).text).toBe('first')
  const [opened] = two.asked
  expect(opened!.thread).toMatchObject({ id: expect.stringMatching(/^chat-pc:/), generation: 1, fresh: true })
  expect(opened!.handoff!.text).toStartWith('Context handoff: this chat continued with another model (other/m).')
  expect(JSON.stringify(opened!.delta)).toContain('"go"')

  down.clear()
  links.reopen('one')
  await until(() => borrowed()?.pc === 'one' && !!borrowed()?.online)
  expect((await sand.turns.run(chat, 'again')).text).toBe('second')
  expect(two.asked[1]!.thread).toEqual({ ...opened!.thread!, fresh: false, seenHead: expect.any(String), native: { id: 'n1', cwd: '/far' } })

  expect((await sand.turns.run(chat, 'more')).text).toBe('fresh start')
  expect(calls).toEqual(['one', 'two', 'two', 'two', 'one'])
  const [restarted] = one.asked
  expect(restarted!.thread).toMatchObject({ generation: 2, fresh: true })
  expect(restarted!.thread!.native).toBeUndefined()
  expect(restarted!.handoff).toBeDefined()
})

test('a PC from before caps lends a stateless source, and a reply cut off mid-way is sent again unchanged', async () => {
  sand = await startSand([])
  const old = await accountPc(nativeCaps, [[{ type: 'start', model: 'remote/m' }, { type: 'text', index: 0, text: 'cut' }], reply('whole')])
  linksTo({ old: withoutCaps(old.answer) }, new Set(), [])
  await until(() => !!sand.app.get(llm)!.find!('remote/m'))
  expect(sand.app.get(llm)!.caps!('remote/m')).toEqual(statelessCaps())

  const chat = sand.chat('remote/m')
  expect((await sand.turns.run(chat, 'go')).text).toBe('whole')
  expect(old.asked).toHaveLength(2)
  expect(old.asked[1]).toEqual(old.asked[0]!)
})

test('stopping a turn on a borrowed source stops the reply on the PC that runs it', async () => {
  sand = await startSand([])
  const pc = await accountPc(nativeCaps, ['hold'])
  linksTo({ pc: pc.answer }, new Set(), [])
  await until(() => !!sand.app.get(llm)!.find!('remote/m'))

  const chat = sand.chat('remote/m')
  const running = sand.turns.run(chat, 'go')
  await until(() => pc.asked.length === 1)
  sand.turns.interrupt(chat)
  expect((await running).stopReason).toBe('interrupted')
  await until(pc.stopped)
})
