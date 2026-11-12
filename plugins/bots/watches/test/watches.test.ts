import { botOpen } from '@sand/bot-turns/contract'
import { botWatchCreate, botWatchList, botWatchRemove } from '@sand/bot-watches/contract'
import { botCreate, botDelete, type BotEntry, botList } from '@sand/bots/contract'
import { type Message, textOf } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { type Change, watches } from '@sand/watches/contract'
import { afterEach, expect, test } from 'bun:test'
import { z } from 'zod'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string): Reply => [{ type: 'text', text }]

const models = { main: { model: 'fake/b' }, quick: {} }

const emitters = new Map<string, (change: Change) => void>()

const start = async (replies: Reply[]) => {
  sand = await startSand([{ id: 'fake', models: ['b'], replies, api: 'anthropic' }], {
    plugins: ['automation/watches', 'agent/mcp-server', 'bots/bots', 'bots/memory', 'bots/turns', 'bots/watches'],
    options: { watches: { debounce_ms: 20 } },
  })
  sand.app.get(watches)!.kind({
    name: 'fake',
    label: 'Fake feed',
    description: 'A feed the test changes by hand',
    input: z.object({ feed: z.string() }),
    describe: ({ feed }) => feed,
    start: (_, { id, emit }) => {
      emitters.set(id, emit)
      return { info: { url: `https://hooks.test/${id}` } }
    },
  })
  return sand
}

const until = async (done: () => Promise<boolean>) => {
  for (let tries = 0; tries < 1000 && !(await done()); tries++) await Bun.sleep(10)
  expect(await done()).toBe(true)
}

const asBot = (bot: string): Conversation => ({
  id: bot,
  owner: 'bot',
  cwd: sand.home,
  append() {
    throw new Error('Tests only read this conversation')
  },
  path: () => [],
  entries: () => [],
})

const use = async (bot: string, name: string, input: Record<string, unknown>) => {
  const conversation = asBot(bot)
  const call = { type: 'tool_call', id: `${name}-${Bun.randomUUIDv7()}`, name, input } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: conversation.cwd, signal: new AbortController().signal, conversation, turn: 'test', progress() {}, wait: () => () => {} })
  const text = textOf(result.content)
  if (result.isError) throw new Error(text)
  return JSON.parse(text)
}

const userTexts = async (bot: string) =>
  (await sand.ask(botOpen, { bot })).entries.flatMap((entry: BotEntry) =>
    entry.type === 'message' && (entry.data as Message).role === 'user' ? [textOf((entry.data as Message).content)] : [],
  )

test('a change to what a bot watches wakes it with the change and its instructions', async () => {
  await start([said('Nothing breaks; noted the new release.')])
  const bot = await sand.ask(botCreate, { name: 'Releases', job: 'Follow releases.', models })

  const watch = await sand.ask(botWatchCreate, { bot: bot.id, label: 'Release feed', instructions: 'Tell the user if a release breaks their build', kind: 'fake', input: { feed: 'releases' } })
  expect(watch).toMatchObject({ bot: bot.id, label: 'Release feed', kind: 'fake', kindLabel: 'Fake feed', target: 'releases' })
  await until(async () => (await sand.ask(botWatchList, { bot: bot.id }))[0]?.info?.url === `https://hooks.test/${watch.id}`)

  emitters.get(watch.id)!({ at: Date.now(), from: 'feed', summary: 'Release 2.0 is out', detail: 'It drops Node 18' })
  await until(async () => (await sand.ask(botList, {})).find(listed => listed.id === bot.id)?.last?.text === 'Nothing breaks; noted the new release.')

  const [prompt] = await userTexts(bot.id)
  expect(prompt).toContain('Release feed')
  expect(prompt).toContain('feed: Release 2.0 is out\nIt drops Node 18')
  expect(prompt).toContain('<instructions>\nTell the user if a release breaks their build\n</instructions>')
  expect(prompt).toContain('Save what you learn about this system to your memory')
  await until(async () => (await sand.ask(botWatchList, { bot: bot.id }))[0]?.changed !== undefined)

  expect(await sand.ask(botWatchRemove, { watch: watch.id })).toBe(true)
  expect(await sand.ask(botWatchList, { bot: bot.id })).toEqual([])
})

test('a bot listens through its tools, and its watches go when it does', async () => {
  await start([])
  const bot = await sand.ask(botCreate, { name: 'Docs', job: 'Follow the docs.', models })

  const made = await use(bot.id, 'watch_create', { label: 'Docs feed', instructions: 'Note what changed in the docs', watch: { kind: 'fake', feed: 'docs' } })
  expect(made).toMatchObject({ bot: bot.id, label: 'Docs feed', kindLabel: 'Fake feed', target: 'docs' })
  expect(await use(bot.id, 'watch_list', {})).toMatchObject([{ id: made.id, label: 'Docs feed' }])
  expect(await use(bot.id, 'watch_remove', { id: made.id })).toBe(true)
  expect(await use(bot.id, 'watch_list', {})).toEqual([])

  await use(bot.id, 'watch_create', { label: 'Docs feed', instructions: 'Note what changed in the docs', watch: { kind: 'fake', feed: 'docs' } })
  await sand.ask(botDelete, { bot: bot.id })
  expect(sand.app.get(watches)!.list('bots', bot.id)).toEqual([])
})
