import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { McpServer } from '@modelcontextprotocol/server'
import { botCreate, botConversation, type BotEntry } from '@sand/bots/contract'
import { botAwait, botStarts, type BotReplyEntry } from '@sand/bot-bridge/contract'
import { type Entry, type Message, type Session, textOf, type UserContent } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import { startSand, type Sand } from '@sand/harness'
import { defaultsSet } from '@sand/model/contract'
import type { Call } from '@sand/orchestrator/contract'
import type { Reply } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { botTools } from '../src/mcp/tools'

let sand: Sand
let folder: string

afterEach(async () => {
  await sand.stop()
  rmSync(folder, { recursive: true, force: true })
})

const said = (text: string): Reply => [{ type: 'text', text }]

const start = async (thread: Reply[], bot: Reply[]) => {
  folder = mkdtempSync(join(tmpdir(), 'sand-project-'))
  sand = await startSand(
    [
      { id: 'fake', models: ['t'], replies: thread, api: 'anthropic' },
      { id: 'botsrc', models: ['b'], replies: bot, api: 'anthropic' },
    ],
    {
      plugins: ['agent/context', 'agent/mcp-server', 'agent/threads-mcp', 'bots/bots', 'bots/memory', 'bots/turns', 'bots/bridge'],
      projects: [{ project: 'p1', path: folder }],
    },
  )
  return sand
}

const createBot = (name: string) => sand.ask(botCreate, { name, job: `Be ${name}.`, models: { main: { model: 'botsrc/b' }, quick: {} } })

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

const registry = () => {
  const found = sand.app.get(tools)
  if (!found) throw new Error('tools did not start')
  return found
}

const use = async (conversation: Conversation | Session, name: string, input: Record<string, unknown>) => {
  const call = { type: 'tool_call', id: `${name}-${Bun.randomUUIDv7()}`, name, input } as const
  const result = await registry().run(call, { cwd: conversation.cwd, signal: new AbortController().signal, conversation, turn: 'test', progress() {}, wait: () => () => {} })
  const text = textOf(result.content)
  return result.isError ? { error: text } : JSON.parse(text)
}

const userMessages = (entries: (BotEntry | Entry)[]) =>
  entries.flatMap(entry => (entry.type === 'message' && (entry.data as Message).role === 'user' ? [entry.data as Message] : []))

const recordsOf = (message: Message) => message.content.flatMap(block => (block.type === 'context' ? block.records : []))

const mentioning = (bot: string, before: string, after: string): UserContent[] => [
  { type: 'text', text: `${before}[Calendar](sand-context://v1/bot/m1)${after}` },
  { type: 'context', records: [{ v: 1, id: 'm1', kind: 'bot', label: 'Calendar', data: { id: bot } }] },
]

const sendAndSettle = async (thread: Session, prompt: UserContent[]) => {
  const sent = await sand.turns.send(thread, { prompt, clientRequestId: Bun.randomUUIDv7() })
  if (sent.disposition !== 'started') throw new Error('The message did not start a turn')
  await sand.turns.wait(sent.turn, 'end')
}

const cardAt = async (thread: Session, index: number) => {
  for (let tries = 0; tries < 300; tries++) {
    const found = thread.path().filter(entry => entry.type === 'bot-reply')[index]
    if (found) return found.data as BotReplyEntry
    await Bun.sleep(10)
  }
  throw new Error(`No bot reply card ${index}`)
}

const lastReply = (thread: Session) => {
  const message = thread.latest('message')?.data as Message
  return message.role === 'assistant' ? textOf(message.content) : undefined
}

const seenIn = (request: string) =>
  (JSON.parse(request).messages as { content: { text?: string }[] }[]).flatMap(message => message.content.map(block => block.text ?? '')).join('\n')

test('a thread hands a bot a task and gets its reply, and an @ mention hands the message to the bot with its reply as a card', async () => {
  await start([[], said('README fixed.')], [said('Tomorrow: dentist at 9.'), said('Noted.'), said('Booked.')])
  const bot = await createBot('Calendar')
  const thread = sand.chat('fake/t')

  expect(await use(thread, 'bot_list', {})).toEqual([{ bot: bot.id, name: 'Calendar', job: 'Be Calendar.', status: 'idle', project: null }])
  expect(await use(thread, 'bot_send', { bot: bot.id, prompt: "What's on tomorrow?" })).toMatchObject({ bot: bot.id, status: 'completed', reply: 'Tomorrow: dentist at 9.' })
  const [asked] = userMessages((await sand.ask(botConversation, { bot: bot.id })).entries)
  expect(textOf(asked!.content)).toContain("from the agent working in the user's thread")
  expect(recordsOf(asked!)).toEqual([expect.objectContaining({ kind: 'thread', data: { id: thread.id, sent: true } })])

  await sendAndSettle(thread, mentioning(bot.id, '', ' note the dentist'))
  const first = await cardAt(thread, 0)
  expect(await sand.ask(botAwait, { bot: bot.id, turn: first.turn!, timeoutMs: 5000 })).toMatchObject({ status: 'completed', reply: 'Noted.' })
  expect(seenIn(sand.requests('fake')[0]!)).toContain('if nothing is, end your turn without writing anything')
  expect(lastReply(thread)).toBe('')

  await sendAndSettle(thread, mentioning(bot.id, '', ' book Friday, and fix the README'))
  expect(lastReply(thread)).toBe('README fixed.')
  expect(seenIn(sand.requests('fake')[1]!)).toContain('Calendar replied to the user:\n\nNoted.')
  const second = await cardAt(thread, 1)
  expect(await sand.ask(botAwait, { bot: bot.id, turn: second.turn!, timeoutMs: 5000 })).toMatchObject({ status: 'completed', reply: 'Booked.' })
})

const botTexts = async (bot: string) => userMessages((await sand.ask(botConversation, { bot })).entries).map(message => textOf(message.content))

const noticeFor = async (bot: string) => {
  for (let tries = 0; tries < 300; tries++) {
    const found = (await botTexts(bot)).find(text => text.startsWith('<task-notification>'))
    if (found) return found
    await Bun.sleep(10)
  }
  throw new Error('The bot heard nothing')
}

test('a bot starts a thread in its project, which says the bot sent it and tells the bot its final reply, but not after turns the user starts', async () => {
  await start([said('README fixed.'), said('Glad to help.'), said('Hi back.')], [said('The README is fixed.')])
  await sand.ask(defaultsSet, { patch: { model: 'fake/t' } })
  const bot = await createBot('Builder')

  expect(await use(asBot(bot.id), 'thread_start', { prompt: 'Fix the README' })).toEqual({ error: expect.stringContaining('Give either cwd or project') })
  expect(await use(asBot(bot.id), 'bot_project', { project: 'p1' })).toMatchObject({ bot: bot.id, project: 'p1' })
  const started = await use(asBot(bot.id), 'thread_start', { prompt: 'Fix the README' })
  const thread = sand.sessions.require(started.thread)
  expect(thread.project).toBe('p1')
  expect(sand.turns.get(started.turn)?.origin).toBe('bot')
  expect(await sand.ask(botStarts, {})).toEqual({ [thread.id]: bot.id })
  expect(recordsOf(userMessages(thread.path())[0]!)).toEqual([expect.objectContaining({ kind: 'bot', label: 'Builder', data: { id: bot.id, sent: true } })])
  const notice = await noticeFor(bot.id)
  expect(notice).toContain(`<thread>${thread.id}</thread>`)
  expect(notice).toContain('<status>done</status>')
  expect(notice).toContain('README fixed.')

  await sendAndSettle(thread, [{ type: 'text', text: 'Thanks' }])
  await Bun.sleep(100)
  expect(await botTexts(bot.id)).toHaveLength(1)

  expect(await use(asBot(bot.id), 'project_list', {})).toEqual([{ project: 'p1', folder }])
  const other = sand.chat('fake/t')
  const sent = await use(asBot(bot.id), 'thread_send', { thread: other.id, prompt: 'Hi' })
  await sand.turns.wait(sent.turn, 'end')
  expect(lastReply(other)).toBe('Hi back.')
  expect(recordsOf(userMessages(other.path())[0]!)).toEqual([expect.objectContaining({ kind: 'bot', data: { id: bot.id, sent: true } })])
  expect(await use(asBot(bot.id), 'thread_list', { mine: true })).toEqual([expect.objectContaining({ thread: thread.id, project: 'p1', status: 'completed' })])
  expect(await use(asBot(bot.id), 'thread_update', { thread: thread.id, settled: true })).toMatchObject({ thread: thread.id, settled: true })
  expect(await use(asBot(bot.id), 'thread_wait', { thread: thread.id })).toEqual({ error: expect.any(String) })
})

test('a bot cannot message itself', async () => {
  await start([], [])
  const bot = await createBot('Ping')

  expect(await use(asBot(bot.id), 'bot_send', { bot: bot.id, prompt: 'me' })).toEqual({ error: expect.stringContaining("can't message itself") })
})

test('a bot hands another bot a task without waiting, and hears its reply as a task notification', async () => {
  await start([], [said('Booked for Friday.'), said('Thanks, noted.')])
  const asker = await createBot('Planner')
  const travel = await createBot('Travel')

  const sent = await use(asBot(asker.id), 'bot_send', { bot: travel.id, prompt: 'Book Friday' })
  expect(sent).toEqual({ bot: travel.id, turn: expect.any(String), status: 'running', reported: true })
  const [asked] = userMessages((await sand.ask(botConversation, { bot: travel.id })).entries)
  expect(textOf(asked!.content)).toContain('This message is from Planner, another of the user\'s bots')

  const notice = await noticeFor(asker.id)
  expect(notice).toContain(`<bot>${travel.id}</bot>`)
  expect(notice).toContain('<label>Travel</label>')
  expect(notice).toContain('<status>done</status>')
  expect(notice).toContain('Booked for Friday.')
})

test('an outside agent lists bots, hands one a task and reads its reply over MCP', async () => {
  await start([], [said('Booked for Friday.')])
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

  expect(Object.fromEntries(botTools.map(tool => [tool.name, tool.access]))).toEqual({ bot_list: 'read', bot_send: 'operate', bot_read: 'read', bot_project: 'operate' })
  expect((await client.listTools()).tools.map(tool => tool.name)).toEqual(['bot_list', 'bot_send', 'bot_read', 'bot_project'])
  expect(await value('bot_list', {})).toEqual([{ bot: bot.id, name: 'Travel', job: 'Be Travel.', status: 'idle', project: null }])
  expect(await value('bot_send', { bot: bot.id, prompt: 'Book Friday' })).toMatchObject({ status: 'completed', reply: 'Booked for Friday.' })
  const page = await value('bot_read', { bot: bot.id })
  expect(page.items.map(({ role }: { role: string }) => role)).toEqual(['user', 'assistant'])
  expect(page.items[0].text).toContain('from an outside agent')
  await client.close()
})
