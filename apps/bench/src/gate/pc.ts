import { Database } from 'bun:sqlite'
import { cpSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BrowserContext, Page } from 'playwright'
import { startPhone } from '../phone'
import type { Plan, Served } from '../sandbox'
import { interleave, repeated, type Row, type Run, type Runs, type Suite, type Tree } from './row'
import { usage } from './process'
import { allOrNone } from './together'

interface Prepared {
  tree: Tree
  box: string
  chat: string
  bulk: string
}

interface Copy {
  tree: Tree
  home: string
  chat: string
  run: Run
}

interface Live extends Copy {
  served: Served
}

interface Driven extends Live {
  page: Page
}

const TURNS = 100
const REPLIES_AVERAGED = 10
const IDLE_MS = 60_000
const SETTLE_MS = 15_000
const QUERY = 'student'
const MESSAGES_PER_ROW = 10_000
const INDEX_POLL_MS = 1000
const PAIR_TIMEOUT_MS = 60_000

const REPLIES_PER_TURN = 3

const CHATS: Plan = { script: { replies: (TURNS + REPLIES_AVERAGED + 1) * REPLIES_PER_TURN, gapMs: 0 }, plugin: 'index.ts' }
const BULK: Plan = { script: { replies: 0, gapMs: 0 }, plugin: 'bulk.ts', addons: ['message-search'] }

const rows: Row[] = [
  { name: 'start-up until ready', unit: 'ms', rule: 'timing', read: run => run.marks.get('start-up') },
  { name: 'memory while idle', unit: 'bytes', rule: 'timing', read: run => run.marks.get('idle memory') },
  { name: `CPU used over ${IDLE_MS / 1000} s idle`, unit: 'ms', rule: 'timing', read: run => run.marks.get('idle CPU') },
  { name: `memory after ${TURNS} scripted chat turns`, unit: 'bytes', rule: 'timing', read: run => run.marks.get('memory after turns') },
  { name: 'CPU for one reply', unit: 'ms', rule: 'timing', read: run => run.marks.get('reply CPU') },
  { name: 'search time on 100k messages', unit: 'ms', rule: 'timing', read: run => run.marks.get('search') },
  { name: 'database size per 10k messages', unit: 'bytes', rule: 'exact', read: run => run.marks.get('database per 10k') },
]

const removeAll = (homes: string[]) => {
  for (const home of homes) rmSync(home, { recursive: true, force: true })
}

const prepare = async (tree: Tree): Promise<Prepared> => {
  const [chats, bulk] = await allOrNone([tree.sand.seed(CHATS), tree.sand.seed(BULK)], async ({ box }) => removeAll([box]))
  if (!chats || !bulk) throw new Error('a seed made no home')
  const chat = chats.seeded.threads.find(thread => !thread.long)
  if (!chat) throw new Error('the seed made no short chat')
  return { tree, box: chats.box, chat: chat.id, bulk: bulk.box }
}

const copy = ({ tree, box, chat }: Prepared, run: Run): Copy => {
  const home = mkdtempSync(join(tmpdir(), 'sand-bench-pc-'))
  cpSync(box, home, { recursive: true })
  return { tree, home, chat, run }
}

const pair = async (context: BrowserContext, served: Served) => {
  const page = await context.newPage()
  await page.goto(served.pairUrl)
  await page.getByRole('button', { name: 'Show the sidebar' }).first().waitFor({ timeout: PAIR_TIMEOUT_MS })
  return page
}

const chatTurns = ({ page, chat }: Driven, count: number) =>
  page.evaluate(
    async ([session, turns]) => {
      for (let index = 0; index < turns; index++) {
        await window.bench.ask('thread.send', { session, prompt: `Bench turn ${index}`, origin: 'user', clientRequestId: crypto.randomUUID() })
        let state: { status: string; error?: string }
        do state = (await window.bench.ask('thread.wait', { session, until: 'end' })) as { status: string; error?: string }
        while (state.status === 'running')
        if (state.status !== 'completed') throw new Error(`scripted turn ${index} ended ${state.status}: ${state.error}`)
      }
    },
    [chat, count] as const,
  )

const startUp = async ({ tree, home, run }: Copy) => {
  const began = performance.now()
  await tree.sand.serve(home)
  run.marks.set('start-up', performance.now() - began)
  await tree.sand.stop(home)
}

const idle = async (live: Live[]) => {
  await Bun.sleep(SETTLE_MS)
  const watched = live.map(instance => ({ instance, before: usage(instance.served.pid) }))
  await Bun.sleep(IDLE_MS)
  for (const { instance, before } of watched) {
    const after = usage(instance.served.pid)
    instance.run.marks.set('idle CPU', after.cpuMs - before.cpuMs)
    instance.run.marks.set('idle memory', after.rssBytes)
  }
}

const reply = async (instance: Driven) => {
  const before = usage(instance.served.pid)
  await chatTurns(instance, REPLIES_AVERAGED)
  instance.run.marks.set('reply CPU', (usage(instance.served.pid).cpuMs - before.cpuMs) / REPLIES_AVERAGED)
}

const leaks = async (driven: Driven[]) => {
  await Promise.all(driven.map(instance => chatTurns(instance, TURNS)))
  await Bun.sleep(SETTLE_MS)
  for (const instance of driven) instance.run.marks.set('memory after turns', usage(instance.served.pid).rssBytes)
}

const eachOf = <T, U>(rounds: T[][], act: (item: T) => Promise<U>) => Promise.all(rounds.map(items => Promise.all(items.map(act))))

const serving = async (prepared: Prepared[], runs: Runs, rounds: number) => {
  const copies = Array.from({ length: rounds }, () => prepared.map(each => copy(each, runs.add(each.tree))))
  const browser = await startPhone({ cpuSlowdown: 1 })
  try {
    await interleave(copies, startUp)
    const live = await eachOf(copies, async (instance): Promise<Live> => ({ ...instance, served: await instance.tree.sand.serve(instance.home) }))
    await idle(live.flat())
    const driven = await eachOf(live, async (instance): Promise<Driven> => ({ ...instance, page: await pair(browser.context, instance.served) }))
    await Promise.all(driven.flat().map(instance => chatTurns(instance, 1)))
    await interleave(driven, reply)
    await leaks(driven.flat())
  } finally {
    await browser.close()
    await Promise.all(copies.flat().map(({ tree, home }) => tree.sand.stop(home)))
    removeAll(copies.flat().map(({ home }) => home))
  }
}

const indexed = async (page: Page) => {
  while (await page.evaluate(query => window.bench.ask('messages.search', { query }).then(found => Boolean((found as { indexing?: unknown }).indexing)), QUERY)) await Bun.sleep(INDEX_POLL_MS)
}

const searchMs = (page: Page) =>
  page.evaluate(async query => {
    const start = performance.now()
    await window.bench.ask('messages.search', { query })
    return performance.now() - start
  }, QUERY)

const databaseBytes = (box: string) =>
  ['sand.db', 'sand.db-wal']
    .map(name => join(box, name))
    .filter(existsSync)
    .reduce((sum, file) => sum + statSync(file).size, 0)

const messagesIn = (box: string) => {
  const db = new Database(join(box, 'sand.db'), { readonly: true })
  try {
    return db.query<{ count: number }, []>("select count(*) as count from entries where type = 'message'").get()?.count ?? 0
  } finally {
    db.close()
  }
}

const search = async (prepared: Prepared[], runs: Runs, rounds: number) => {
  const browser = await startPhone({ cpuSlowdown: 1 })
  try {
    const pages = await Promise.all(prepared.map(async ({ tree, bulk }) => ({ tree, page: await pair(browser.context, await tree.sand.serve(bulk)) })))
    await Promise.all(pages.map(async ({ page }) => {
      await indexed(page)
      await searchMs(page)
    }))
    await interleave(repeated(pages, rounds), async ({ tree, page }) => void runs.add(tree).marks.set('search', await searchMs(page)))
  } finally {
    await browser.close()
    await Promise.all(prepared.map(({ tree, bulk }) => tree.sand.stop(bulk)))
  }
  for (const { tree, bulk } of prepared) runs.add(tree).marks.set('database per 10k', (databaseBytes(bulk) * MESSAGES_PER_ROW) / messagesIn(bulk))
}

const measure = async (trees: Tree[], runs: Runs, rounds: number) => {
  const prepared = await allOrNone(trees.map(prepare), async ({ box, bulk }) => removeAll([box, bulk]))
  try {
    await serving(prepared, runs, rounds)
    await search(prepared, runs, rounds)
  } finally {
    removeAll(prepared.flatMap(({ box, bulk }) => [box, bulk]))
  }
}

const pc: Suite = { group: 'PC side', rows, measure }

export { pc }
