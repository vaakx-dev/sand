import type { RouteCaller } from '@sand/host-gateway/contract'
import { sandConfig } from '@sand/config/contract'
import { type Peers as PcLinks, peers as pcLinks } from '@sand/devices-contract'
import { startSand, type Sand } from '@sand/harness'
import { media } from '@sand/media/contract'
import type { RouteHandler, Server } from '@sand/server/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAccounts } from '../src/auth/accounts'
import { readPlaces } from '../src/auth/places'
import { createPlans } from '../src/auth/plans'
import { PriceList, type UserPrices } from '../src/catalog/prices'
import { viewOf } from '../src/catalog/view'
import { llm, type LLMEvent, type LLMRequest, type ModelPrice, modelsPrice, type NativeRef, type Plan, type ProviderCapabilities, statelessCaps, ThreadLost } from '../src/contract'
import type { LocalLLM } from '../src/local'
import { shareChange, sharePaths } from '../src/share/info'
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

const accountPc = async (caps: ProviderCapabilities, replies: Reply[], userPrices: UserPrices = {}): Promise<AccountPc> => {
  const home = mkdtempSync(join(tmpdir(), 'sand-account-pc-'))
  homes.push(home)
  await Bun.write(join(home, 'auth.json'), JSON.stringify({ remote: { type: 'oauth', access: 'a', refresh: 'r', expires: 8e15 } }))
  const plans = createPlans({ saved: {}, places: await readPlaces(home), save: async () => {}, changed() {}, dropped() {} })
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
    pastTurns: async () => [],
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
    tell() {},
    hello: () => () => {},
    pages: () => 0,
    ask: () => Promise.reject(new Error('No requests in this test')),
    route(path, handler) {
      routes.set(path, handler)
      return () => void routes.delete(path)
    },
  }
  const prices = new PriceList({ settings: userPrices, config: sand.app.get(sandConfig)!, borrowed: () => [], changed() {} })
  serveShare(server, { local, accounts, prices, users: createUsers(new Map(), () => {}), media: sand.app.get(media)! })
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

const lentOnly = (answer: RouteHandler, lent: () => boolean): RouteHandler => async (request, from) => {
  const response = await answer(request, from)
  if (new URL(request.url).pathname !== sharePaths.info || lent()) return response
  return Response.json({ ...(await response.json()), accounts: [], models: [] })
}

const linksTo = (pcs: Record<string, RouteHandler>, down: Set<string>, calls: string[]) => {
  const opened = new Set<(pc: string) => void>()
  const changed = new Set<() => void>()
  const shareChanged = new Set<(payload: unknown, pc: string) => void>()
  const links: PcLinks = {
    list: () => Object.keys(pcs).map(id => ({ id, name: id, status: { phase: 'connecting', attempt: 0 }, routes: [], attempts: [] })),
    get: () => undefined,
    connected: () => Object.keys(pcs),
    call: () => Promise.reject(new Error('unused')),
    callEach: async () => [],
    async fetch(pc, path, init) {
      if (path === sharePaths.stream) calls.push(pc)
      if (down.has(pc)) throw new Error('connection refused')
      return pcs[pc]!(new Request(`http://${pc}${path}`, init), caller)
    },
    on(event, listener) {
      if (event.id !== shareChange.id) return () => {}
      const heard = (payload: unknown, pc: string) => listener(payload as never, pc)
      shareChanged.add(heard)
      return () => void shareChanged.delete(heard)
    },
    hello: () => undefined,
    directUrl: () => undefined,
    retry() {},
    onOpen(listener) {
      opened.add(listener)
      return () => void opened.delete(listener)
    },
    onChange(listener) {
      changed.add(listener)
      return () => void changed.delete(listener)
    },
  }
  sand.app.provide(pcLinks, links)
  return {
    reopen: (pc: string) => opened.forEach(listener => listener(pc)),
    shareChanged: (pc: string) => shareChanged.forEach(listener => listener(undefined, pc)),
    unpair(pc: string) {
      delete pcs[pc]
      changed.forEach(listener => listener())
    },
  }
}

const until = async (ready: () => boolean) => {
  while (!ready()) await Bun.sleep(5)
}

const borrowed = (pc: string) => sand.app.get(llm)!.accounts!().find(source => source.pc === pc)

test('a borrowed native session gets its thread, delta and handoff, stays on the PC that holds it, and a lost session starts over on its account', async () => {
  sand = await startSand([], { plugins: ['agent/account-pool'] })
  const one = await accountPc(nativeCaps, [])
  const two = await accountPc(nativeCaps, [reply('first', { id: 'n1', cwd: '/far' }), reply('second', { id: 'n1', cwd: '/far' }), new ThreadLost('the app exited'), reply('fresh start')])
  const down = new Set(['one'])
  const calls: string[] = []
  const links = linksTo({ one: one.answer, two: two.answer }, down, calls)
  await until(() => !!sand.app.get(llm)!.find!('remote/m') && borrowed('two')?.online === true)
  expect(sand.app.get(llm)!.caps!('remote/m')).toEqual(nativeCaps)

  const chat = sand.chat('remote/m')
  const usage = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }
  chat.append('message', { role: 'user', content: [{ type: 'text', text: 'hello' }] })
  chat.append('message', { role: 'assistant', content: [{ type: 'text', text: 'hi' }] })
  chat.append('usage', { id: 'u1', model: 'other/m', usage })

  expect((await sand.turns.run(chat, 'go')).text).toBe('first')
  const [opened] = two.asked
  expect(opened!.thread).toMatchObject({ id: expect.stringMatching(/^chat-pc:/), generation: 1, fresh: true })
  expect(opened!.handoff!.text).toMatch(/^Earlier messages of this chat, seq \d+–\d+, with replies from another model \(other\/m\):/)
  expect(JSON.stringify(opened!.delta)).toContain('"go"')

  down.clear()
  links.reopen('one')
  await until(() => borrowed('one')?.online === true)
  expect((await sand.turns.run(chat, 'again')).text).toBe('second')
  expect(two.asked[1]!.thread).toEqual({ ...opened!.thread!, fresh: false, seenHead: expect.any(String), native: { id: 'n1', cwd: '/far' } })

  expect((await sand.turns.run(chat, 'more')).text).toBe('fresh start')
  expect(calls).toEqual(['two', 'two', 'two', 'two'])
  expect(one.asked).toEqual([])
  const restarted = two.asked[3]
  expect(restarted!.thread).toMatchObject({ generation: 2, fresh: true })
  expect(restarted!.thread!.native).toBeUndefined()
  expect(restarted!.handoff).toBeDefined()
})

test('models a PC starts sharing show up when it says so, and go when it is unpaired', async () => {
  sand = await startSand([])
  const pc = await accountPc(statelessCaps(), [reply('lent')])
  let lent = false
  let looked = 0
  const links = linksTo({ pc: lentOnly(pc.answer, () => (looked++, lent)) }, new Set(), [])
  await until(() => looked > 0)
  expect(sand.app.get(llm)!.find!('remote/m')).toBeUndefined()

  lent = true
  links.shareChanged('pc')
  await until(() => !!sand.app.get(llm)!.find!('remote/m'))
  expect((await sand.turns.run(sand.chat('remote/m'), 'go')).text).toBe('lent')

  links.unpair('pc')
  await until(() => !sand.app.get(llm)!.find!('remote/m'))
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

test('a turn waits for a PC that dropped off and carries on there once it is back', async () => {
  sand = await startSand([])
  const pc = await accountPc(statelessCaps(), [reply('after the blip')])
  const down = new Set<string>()
  const calls: string[] = []
  const links = linksTo({ pc: pc.answer }, down, calls)
  await until(() => !!sand.app.get(llm)!.find!('remote/m'))

  down.add('pc')
  const running = sand.turns.run(sand.chat('remote/m'), 'go')
  await until(() => calls.length === 1)
  down.clear()
  links.reopen('pc')
  expect((await running).text).toBe('after the blip')
  expect(calls).toEqual(['pc', 'pc'])
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

const setAt = (input: number, updated: number) => ({ price: { input, output: input, cacheRead: 0, cacheWrite: 0 }, updated })

const priceOf = (model: string) => sand.app.get(llm)!.price!(model)

const rate = (input: number): ModelPrice => ({ input, output: input, cacheRead: 0, cacheWrite: 0 })

test('a price set on another PC counts here, a newer price wins on whichever PC set it, and a PC from before shared prices adds none', async () => {
  sand = await startSand([])
  const soon = Date.now() + 60_000
  const lender = await accountPc(statelessCaps(), [], { 'claude-sonnet-5-5': setAt(3, 1), opus: setAt(5, soon) })
  const old = await accountPc(statelessCaps(), [])
  const dropPrices =
    (answer: RouteHandler): RouteHandler =>
    async (request, from) => {
      const response = await answer(request, from)
      if (new URL(request.url).pathname !== sharePaths.info) return response
      const { userPrices: _, ...info } = await response.json()
      return Response.json(info)
    }
  linksTo({ lender: lender.answer, old: dropPrices(old.answer) }, new Set(), [])
  await until(() => !!priceOf('claude/claude-sonnet-5-5'))

  expect(priceOf('claude/claude-sonnet-5-5')).toEqual(rate(3))
  expect(priceOf('unrelated')).toBeUndefined()

  await sand.ask(modelsPrice, { model: 'claude-sonnet-5-5', price: rate(4) })
  await sand.ask(modelsPrice, { model: 'opus', price: rate(6) })
  expect(priceOf('claude/claude-sonnet-5-5')).toEqual(rate(4))
  expect(priceOf('opus')).toEqual(rate(5))
})
