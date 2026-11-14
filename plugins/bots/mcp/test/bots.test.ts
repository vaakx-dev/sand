import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { McpServer } from '@modelcontextprotocol/server'
import { botAwait, botOpen, botSend } from '@sand/bot-turns/contract'
import { botCreate, type BotEntry, botList, botUpdate, changeEntry } from '@sand/bots/contract'
import { type Message, promptText, textOf } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Call } from '@sand/orchestrator/contract'
import type { Reply } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { botTools } from '../src/tools'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string): Reply => [{ type: 'text', text }]

const start = async (replies: Reply[], plugins: string[] = []) => {
  sand = await startSand([{ id: 'fake', models: ['b'], replies, api: 'anthropic' }], {
    plugins: ['agent/mcp-server', 'bots/bots', 'bots/turns', 'bots/mcp', ...plugins],
  })
  return sand
}

const models = { main: { model: 'fake/b' }, quick: {} }

const createBot = (name: string) => sand.ask(botCreate, { name, models })

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

const use = async (conversation: Conversation, name: string, input: Record<string, unknown>) => {
  const registry = sand.app.get(tools)
  if (!registry) throw new Error('tools did not start')
  const call = { type: 'tool_call', id: `${name}-${Bun.randomUUIDv7()}`, name, input } as const
  const result = await registry.run(call, { cwd: conversation.cwd, signal: new AbortController().signal, conversation, turn: 'test', progress() {}, wait: () => () => {} })
  const text = textOf(result.content)
  return result.isError ? { error: text } : JSON.parse(text)
}

const userTexts = async (bot: string) =>
  (await sand.ask(botOpen, { bot })).entries.flatMap((entry: BotEntry) =>
    entry.type === 'message' && (entry.data as Message).role === 'user' ? [promptText(entry.data as Message)] : [],
  )

const seenIn = (request: string) =>
  (JSON.parse(request).messages as { content: { text?: string }[] }[]).flatMap(message => message.content.map(block => block.text ?? '')).join('\n')

const answered = async (bot: string, prompt: string) => {
  const before = (await sand.ask(botList, {})).find(listed => listed.id === bot)?.last?.at ?? 0
  await sand.ask(botSend, { bot, prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 300; tries++) {
    const last = (await sand.ask(botList, {})).find(listed => listed.id === bot)?.last
    if (last?.role === 'assistant' && last.at > before) return
    await Bun.sleep(10)
  }
  throw new Error(`${prompt} got no reply`)
}

test('a bot cannot message itself', async () => {
  await start([])
  const bot = await createBot('Ping')

  expect(await use(asBot(bot.id), 'bot_send', { bot: bot.id, prompt: 'me' })).toEqual({ error: expect.stringContaining("can't message itself") })
})

const changes = async (bot: string) => (await sand.ask(botOpen, { bot })).entries.filter(entry => entry.type === changeEntry).map(entry => entry.data)

test("a bot can pause another bot and change any bot's limit, its own too, and each change shows in that bot's chat with who made it", async () => {
  await start([])
  const planner = await createBot('Planner')
  const travel = await createBot('Travel')

  expect(await use(asBot(planner.id), 'bot_update', { bot: travel.id, paused: true, budget: 5 })).toMatchObject({ bot: travel.id, hold: 'paused', budget: 5, spent: 0 })
  expect(await use(asBot(planner.id), 'bot_update', { budget: 50 })).toMatchObject({ bot: planner.id, budget: 50 })
  await sand.ask(botUpdate, { bot: planner.id, patch: { budget: 20, color: planner.color } })

  expect(await changes(travel.id)).toEqual([{ by: { kind: 'bot', id: planner.id, label: 'Planner' }, before: { paused: false, budget: null }, after: { paused: true, budget: 5 } }])
  expect(await changes(planner.id)).toEqual([
    { by: { kind: 'bot', id: planner.id, label: 'Planner' }, before: { budget: null }, after: { budget: 50 } },
    { by: { kind: 'user' }, before: { budget: 50 }, after: { budget: 20 } },
  ])
})

test('a bot messages another bot without waiting, and hears back only if that bot messages it', async () => {
  await start([said('Booked for Friday.')], ['agent/context', 'bots/bridge'])
  const asker = await createBot('Planner')
  const travel = await createBot('Travel')

  const sent = await use(asBot(asker.id), 'bot_send', { bot: travel.id, prompt: 'Book Friday' })
  expect(sent).toEqual({ bot: travel.id, turn: expect.any(String), status: 'running', detached: true })
  const [asked] = await userTexts(travel.id)
  expect(asked).toMatch(/^\[Planner\]\(sand-context:\/\/v1\/bot\/[^)]+\) Book Friday$/)
  expect(await sand.ask(botAwait, { bot: travel.id, turn: sent.turn, timeoutMs: 5000 })).toMatchObject({ status: 'completed', reply: 'Booked for Friday.' })
  const seen = seenIn(sand.requests('fake')[0]!)
  expect(seen).toContain(`This message is from the user's bot "Planner" (id ${asker.id}), not from the user.`)
  expect(seen).toContain('if it asks to hear back, message it with bot_send')
  await Bun.sleep(100)
  expect(await userTexts(asker.id)).toEqual([])
})

test('a bot looks up its own past with history_read: what was said and done, and when', async () => {
  await start([[{ type: 'call', name: 'bot_list', input: {} }], said('You have one bot.'), said('Noted.')], ['bots/bridge', 'agent/threads-mcp'])
  const bot = await createBot('Clerk')
  await answered(bot.id, 'Which bots do I have?')
  await answered(bot.id, 'Thanks')
  const read = (input: Record<string, unknown>) => use(asBot(bot.id), 'history_read', input)

  const talk = await read({})
  expect(talk.bot).toBe(bot.id)
  expect(talk.items.map(({ text }: { text: string }) => text)).toEqual(['Which bots do I have?', 'You have one bot.', 'Thanks', 'Noted.'])
  expect(talk.items[0].at).toMatch(/^\w{3} \d{4}-\d\d-\d\d \d\d:\d\d [+-]\d\d:\d\d$/)

  const done = await read({ view: 'activity', query: 'bot_list' })
  expect(done.items.map(({ text }: { text: string }) => text)).toEqual(['[bot_list] {}', expect.stringMatching(/^\[bot_list result\] .*Clerk/)])

  const older = await read({ before: talk.items[2].seq, limit: 1 })
  expect(older).toMatchObject({ items: [{ text: 'You have one bot.' }], more: true })
  expect(await read({ item: String(done.items[1].seq) })).toMatchObject({ bot: bot.id, seq: done.items[1].seq, text: expect.stringMatching(/^\[bot_list result\] .*Clerk/) })
})

test('a bot with no jobs sets one up and works to it from its next step; its runs mark the job as needing the user until the next report', async () => {
  const notes = { title: 'Notes', goal: "Keep the user's notes tidy.", done: 'Every note has a tag.' }
  await start([[{ type: 'call', name: 'job_create', input: notes }], said('Done.')])
  const bot = await sand.ask(botCreate, { models })

  await answered(bot.id, 'Keep my notes')
  const [, next] = sand.requests('fake').map(body => JSON.parse(body).system[0].text as string)
  expect(next).toContain(notes.goal)
  const [job] = (await sand.ask(botList, {})).find(listed => listed.id === bot.id)!.jobs
  expect(job).toMatchObject({ ...notes, status: 'on', runs: [] })

  const me = asBot(bot.id)
  expect(await use(me, 'job_report', { job: job!.id, outcome: 'needs', summary: 'Found untagged notes' })).toEqual({ error: expect.stringContaining('question') })
  expect(await use(me, 'job_report', { job: job!.id, outcome: 'needs', summary: 'Found 3 untagged notes', question: 'Tag them as work?' })).toMatchObject({
    status: 'needs',
    question: 'Tag them as work?',
    last: 'Found 3 untagged notes',
  })
  expect(await use(me, 'job_report', { job: job!.id, outcome: 'nothing' })).toEqual({ job: job!.id, ...notes, status: 'on', last: 'Nothing to do' })
  expect(await use(me, 'job_update', { job: job!.id, paused: true, title: 'Tidy notes' })).toMatchObject({ title: 'Tidy notes', status: 'paused' })
  expect(await use(me, 'job_delete', { job: job!.id })).toBe(true)
  expect((await sand.ask(botList, {})).find(listed => listed.id === bot.id)!.jobs).toEqual([])
})

test('an outside agent lists, makes, stops and deletes bots, hands one a task, gets its reply and renames it over MCP', async () => {
  await start([said('Booked for Friday.')])
  const bot = await createBot('Travel')
  const call: Call = sand.askAs({ device: 'outside', kind: 'agent' })
  const server = new McpServer({ name: 'sand', version: '1.0.0' })
  for (const tool of botTools)
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.input }, async input => ({
      content: [{ type: 'text', text: JSON.stringify(await tool.run(input, { call })) }],
    }))
  const [near, far] = InMemoryTransport.createLinkedPair()
  await server.connect(far)
  const client = new Client({ name: 'outside', version: '1.0.0' })
  await client.connect(near)
  const value = async (name: string, input: Record<string, unknown>) => {
    const [first] = (await client.callTool({ name, arguments: input })).content
    return first?.type === 'text' ? JSON.parse(first.text) : undefined
  }

  expect(await value('bot_list', {})).toEqual([{ bot: bot.id, name: 'Travel', jobs: [], status: 'idle', projects: [], budget: null, spent: 0 }])
  expect(await value('bot_send', { bot: bot.id, prompt: 'Book Friday' })).toMatchObject({ status: 'completed', reply: 'Booked for Friday.' })
  expect(await value('bot_update', { bot: bot.id, name: 'Trips' })).toMatchObject({ bot: bot.id, name: 'Trips' })
  const made = await value('bot_create', { name: 'Errands', budget: 10 })
  expect(made).toMatchObject({ name: 'Errands', budget: 10, status: 'idle' })
  expect(await value('bot_interrupt', { bot: made.bot })).toBe(false)
  expect(await value('bot_delete', { bot: made.bot })).toBe(true)
  expect((await value('bot_list', {})).map((row: { name: string }) => row.name)).toEqual(['Trips'])
  await client.close()
})
