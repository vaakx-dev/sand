import { botCreate, type BotEntry } from '@sand/bots/contract'
import { botSubagents, type BotReplyEntry } from '@sand/bot-bridge/contract'
import { threadList } from '@sand/orchestrator/contract'
import { botAwait, botOpen } from '@sand/bot-turns/contract'
import { type Entry, type Message, promptText, type Session, textOf, type UserContent } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import { startSand, type Sand } from '@sand/harness'
import { defaultsSet } from '@sand/model/contract'
import type { Reply } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
      plugins: ['core/watch', 'agent/subagents', 'agent/context', 'agent/mcp-server', 'agent/threads-mcp', 'bots/bots', 'bots/turns', 'bots/mcp', 'bots/bridge'],
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

const textsOf = (messages: Message[]) => messages.map(message => textOf(message.content))

const botTexts = async (bot: string) => textsOf(userMessages((await sand.ask(botOpen, { bot })).entries))

const noticeIn = async (texts: () => string[] | Promise<string[]>) => {
  for (let tries = 0; tries < 300; tries++) {
    const found = (await texts()).find(text => text.startsWith('<task-notification>'))
    if (found) return found
    await Bun.sleep(10)
  }
  throw new Error('Nothing came back')
}

const noticeFor = (bot: string) => noticeIn(() => botTexts(bot))

test('a thread messages a bot, which answers only by messaging the thread back, and an @ mention hands the message to the bot with its reply as a card', async () => {
  await start([said('Dentist noted.'), [], [], said('README fixed.')], [said('Tomorrow: dentist at 9.'), said('Noted.'), said('Booked.')])
  const bot = await createBot('Calendar')
  const thread = sand.chat('fake/t')

  expect(await use(thread, 'bot_list', {})).toEqual([{ bot: bot.id, name: 'Calendar', job: 'Be Calendar.', status: 'idle', projects: [], budget: null, spent: 0 }])
  const sent = await use(thread, 'bot_send', { bot: bot.id, prompt: "What's on tomorrow? Message me the answer." })
  expect(sent).toEqual({ bot: bot.id, turn: expect.any(String), status: 'running', detached: true })
  const [asked] = userMessages((await sand.ask(botOpen, { bot: bot.id })).entries)
  expect(promptText(asked!)).toBe(`[thread](sand-context://v1/thread/${recordsOf(asked!)[0]!.id}) What's on tomorrow? Message me the answer.`)
  expect(recordsOf(asked!)).toEqual([expect.objectContaining({ kind: 'thread', data: { id: thread.id, sent: true } })])
  expect(await sand.ask(botAwait, { bot: bot.id, turn: sent.turn, timeoutMs: 5000 })).toMatchObject({ status: 'completed', reply: 'Tomorrow: dentist at 9.' })
  const botSaw = seenIn(sand.requests('botsrc')[0]!)
  expect(botSaw).toContain(`from the agent working in the user's thread "" (id ${thread.id})`)
  expect(botSaw).toContain('if it asks to hear back, message it with thread_send')
  await Bun.sleep(100)
  expect(userMessages(thread.path())).toEqual([])

  const answer = await use(asBot(bot.id), 'thread_send', { thread: thread.id, prompt: 'Tomorrow: dentist at 9.' })
  await sand.turns.wait(answer.turn, 'end')
  expect(recordsOf(userMessages(thread.path())[0]!)).toEqual([expect.objectContaining({ kind: 'bot', data: { id: bot.id, sent: true } })])
  expect(seenIn(sand.requests('fake')[0]!)).toContain(`This message is from the user's bot "Calendar" (id ${bot.id}), not from the user.`)
  expect(lastReply(thread)).toBe('Dentist noted.')

  await sendAndSettle(thread, mentioning(bot.id, '', ' note the dentist'))
  const first = await cardAt(thread, 0)
  expect(await sand.ask(botAwait, { bot: bot.id, turn: first.turn!, timeoutMs: 5000 })).toMatchObject({ status: 'completed', reply: 'Noted.' })
  expect(seenIn(sand.requests('fake')[1]!)).toContain('if nothing is, end your turn without writing anything')
  expect(lastReply(thread)).toBe('')

  await sendAndSettle(thread, mentioning(bot.id, '', ' book Friday, and fix the README'))
  expect(lastReply(thread)).toBe('README fixed.')
  expect(seenIn(sand.requests('fake')[3]!)).toContain('Calendar replied to the user:\n\nNoted.')
  const second = await cardAt(thread, 1)
  expect(await sand.ask(botAwait, { bot: bot.id, turn: second.turn!, timeoutMs: 5000 })).toMatchObject({ status: 'completed', reply: 'Booked.' })
})

test("a bot starts a thread in its only project, which says the bot sent it and stands on its own: no report back, not listed as the bot's", async () => {
  await start([said('README fixed.'), said('Hi back.')], [])
  await sand.ask(defaultsSet, { patch: { model: 'fake/t' } })
  const bot = await createBot('Builder')

  expect(await use(asBot(bot.id), 'thread_start', { prompt: 'Fix the README' })).toEqual({ error: expect.stringContaining('Give either cwd, project or quick') })
  expect(await use(asBot(bot.id), 'bot_update', { projects: ['p1'] })).toMatchObject({ bot: bot.id, projects: ['p1'] })
  const started = await use(asBot(bot.id), 'thread_start', { prompt: 'Fix the README' })
  const thread = sand.sessions.require(started.thread)
  expect(thread.project).toBe('p1')
  expect(sand.turns.get(started.turn)?.origin).toBe('bot')
  expect(recordsOf(userMessages(thread.path())[0]!)).toEqual([expect.objectContaining({ kind: 'bot', label: 'Builder', data: { id: bot.id, sent: true } })])
  await sand.turns.wait(started.turn, 'end')
  expect(seenIn(sand.requests('fake')[0]!)).toContain('Your reply stays in this chat; if it asks to hear back, message it with bot_send.')
  await Bun.sleep(100)
  expect(await botTexts(bot.id)).toEqual([])
  expect(await sand.ask(botSubagents, {})).toEqual({})
  expect(await use(asBot(bot.id), 'thread_list', { mine: true })).toEqual([])
  expect(await use(asBot(bot.id), 'thread_list', { project: 'p1' })).toEqual([expect.objectContaining({ thread: thread.id, status: 'completed' })])

  const other = sand.chat('fake/t')
  const sent = await use(asBot(bot.id), 'thread_send', { thread: other.id, prompt: 'Hi' })
  await sand.turns.wait(sent.turn, 'end')
  expect(lastReply(other)).toBe('Hi back.')
  expect(await use(asBot(bot.id), 'thread_update', { thread: thread.id, settled: true })).toMatchObject({ thread: thread.id, settled: true })
  expect(await use(asBot(bot.id), 'thread_wait', { thread: thread.id })).toEqual({ error: expect.any(String) })
})

test("a bot's subagent works in the bot's folder, reports back to the bot, and lists as the bot's subagent", async () => {
  await start([said('Found three.')], [])
  const bot = await createBot('Scout')
  const call = { type: 'tool_call', id: 'agent-call', name: 'agent', input: { label: 'Count files', task: 'Count the files', model: 'fake/t' } } as const
  const result = await registry().run(call, { cwd: sand.home, signal: new AbortController().signal, conversation: asBot(bot.id), turn: 'test', progress() {}, wait: () => () => {} })
  const [, id] = /^Started subagent (\S+)\./.exec(textOf(result.content)) ?? []

  const child = sand.sessions.require(id!)
  expect(child).toMatchObject({ kind: 'agent', parent: null, cwd: bot.folder })
  const notice = await noticeFor(bot.id)
  expect(notice).toContain(`<thread>${child.id}</thread>`)
  expect(notice).toContain('Found three.')
  expect(await sand.ask(threadList, { bot: bot.id })).toEqual([expect.objectContaining({ thread: child.id })])
  expect(await sand.ask(botSubagents, {})).toEqual({ [child.id]: bot.id })
  expect(await sand.ask(threadList, {})).toEqual([])
})
