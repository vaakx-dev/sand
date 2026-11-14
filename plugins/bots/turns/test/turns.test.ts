import { botMemorySpace } from '@sand/bot-memory/contract'
import { botCreate, botDelete, jobCreate, botList, type BotEntry, type BotStatus } from '@sand/bots/contract'
import { botInterrupt, botOpen, botSend } from '@sand/bot-turns/contract'
import { imageLabel, type Message } from '@sand/chats/contract'
import { contextChange, contextGet } from '@sand/compaction/contract'
import { startSand, type Sand, type SandOptions } from '@sand/harness'
import { media } from '@sand/media/contract'
import { memoryWrite } from '@sand/memory/contract'
import { server } from '@sand/server/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { resolve } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const start = async (replies: Source['replies'], projects: SandOptions['projects'] = []) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], { plugins: ['agent/memory', 'bots/bots', 'bots/memory', 'bots/turns', 'agent/vstack'], projects })
  return sand
}

const settled = async (bot: string, want: BotStatus = 'idle') => {
  for (let tries = 0; tries < 200; tries++) {
    const found = (await sand.ask(botList, {})).find(listed => listed.id === bot)
    if (found?.status === want && found.last?.role === 'assistant') return found
    await Bun.sleep(10)
  }
  throw new Error(`Bot ${bot} never became ${want}`)
}

const messages = (entries: BotEntry[]) => entries.flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : []))

test('a message to a bot runs a turn on its own conversation with its jobs, memory and model', async () => {
  const { ask, requests } = await start([[said('Noted.')]], [{ project: '0b6c2e1a', name: 'tiles', path: resolve('work', 'tiles') }])
  const bot = await ask(botCreate, { name: 'Calendar', projects: ['family', '0b6c2e1a'], models: { main: { model: 'fake/m', effort: 'low' }, quick: {} } })
  await ask(jobCreate, { bot: bot.id, title: 'Diary', goal: 'Keep my calendar.', done: 'No two events clash.' })
  await ask(memoryWrite, { space: botMemorySpace, id: bot.id, text: 'Gym on Mondays.' })

  expect(await ask(botSend, { bot: bot.id, prompt: 'Lunch with Ana is every Friday', clientRequestId: 'one' })).toMatchObject({ bot: bot.id, status: 'running' })
  expect(await settled(bot.id)).toMatchObject({ status: 'idle', last: { role: 'assistant', text: 'Noted.' } })

  const [first] = requests('fake').map(body => JSON.parse(body))
  const system = first.system[0].text
  expect(system).toStartWith('You are Calendar')
  expect(system).toContain('## Questions are read-only')
  expect(system).toContain('## Avoid dumb moves')
  expect(system).toContain('Keep my calendar.')
  expect(system).toContain('No two events clash.')
  expect(system).toContain('<memory>\nGym on Mondays.\n</memory>')
  expect(system).toContain('## Your projects')
  expect(system).toContain('- family: no folder on this PC')
  expect(system).toContain(`- tiles (id 0b6c2e1a): ${resolve('work', 'tiles')}`)
  expect(first.messages).toEqual([{ role: 'user', content: [expect.objectContaining(said('Lunch with Ana is every Friday'))] }])

  const { entries } = await ask(botOpen, { bot: bot.id })
  expect(messages(entries).map(message => message.role)).toEqual(['user', 'assistant'])
  expect(sand.sessions.list()).toEqual([])
})

test("a bot's context usage is served and broadcast, like a thread's", async () => {
  const { ask, app } = await start([[said('Noted.'), { type: 'usage', input: 1200, output: 30 }]])
  const broadcast: unknown[] = []
  const hub = app.get(server)
  if (!hub) throw new Error('server did not start')
  hub.broadcast = (event, payload) => {
    if (event.id === contextChange.id) broadcast.push(payload)
  }
  const bot = await ask(botCreate, { name: 'Errands', models: { main: { model: 'fake/m' }, quick: {} } })
  await ask(botSend, { bot: bot.id, prompt: 'Buy milk', clientRequestId: 'one' })
  await settled(bot.id)

  const usage = await ask(contextGet, { session: bot.id, owner: 'bot' })
  expect(usage?.used).toBe(1230)
  expect(broadcast).toContainEqual([bot.id, expect.objectContaining({ used: 1230 })])
})

test('a failed turn marks the bot failed, and deleting a bot forgets its turns', async () => {
  const { ask } = await start([[{ type: 'error', message: 'overloaded' }]])
  const bot = await ask(botCreate, { name: 'Errands', models: { main: { model: 'fake/m' }, quick: {} } })
  await ask(botSend, { bot: bot.id, prompt: 'Buy milk', clientRequestId: 'one' })
  for (let tries = 0; tries < 200 && (await ask(botList, {})).find(listed => listed.id === bot.id)?.status !== 'failed'; tries++) await Bun.sleep(10)

  expect((await ask(botList, {})).find(listed => listed.id === bot.id)).toMatchObject({ status: 'failed', last: { role: 'user', text: 'Buy milk' } })
  const { entries } = await ask(botOpen, { bot: bot.id })
  expect(entries.at(-1)).toMatchObject({ type: 'turn-ending', data: { stopReason: 'error' } })

  expect(await ask(botDelete, { bot: bot.id })).toBe(true)
  await expect(ask(botSend, { bot: bot.id, prompt: 'Still there?', clientRequestId: 'two' })).rejects.toThrow(`No bot ${bot.id}`)
})

test('a page that opens mid-reply gets the history and the reply streamed so far in one snapshot, catches up after its last entry, and sees nothing live once the turn ends', async () => {
  const { ask } = await start([[said('Half a '), said('thought'), { type: 'hold' }]])
  const bot = await ask(botCreate, { name: 'Researcher', models: { main: { model: 'fake/m' }, quick: {} } })
  await ask(botSend, { bot: bot.id, prompt: 'Think', clientRequestId: 'one' })
  const streamed = async () => (await ask(botOpen, { bot: bot.id })).live.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('')
  for (let tries = 0; tries < 200 && (await streamed()) !== 'Half a thought'; tries++) await Bun.sleep(10)

  const opened = await ask(botOpen, { bot: bot.id })
  expect(messages(opened.entries)).toMatchObject([{ role: 'user', content: [{ type: 'text', text: 'Think' }] }])
  expect(await streamed()).toBe('Half a thought')
  const last = opened.entries.at(-1)!.seq
  expect(await ask(botOpen, { bot: bot.id, after: last })).toMatchObject({ entries: [], more: false })

  expect(await ask(botInterrupt, { bot: bot.id })).toBe(true)
  for (let tries = 0; tries < 200 && (await ask(botOpen, { bot: bot.id })).live.length; tries++) await Bun.sleep(10)
  const ended = await ask(botOpen, { bot: bot.id, after: last })
  expect(ended.live).toEqual([])
  expect(ended.entries.every(entry => entry.seq > last)).toBe(true)
})

test('a bot whose tool waits on the user is waiting until it answers', async () => {
  const { ask } = await start([[{ type: 'call', name: 'ask' }], [said('Thanks.')]])
  const answered = Promise.withResolvers<string>()
  sand.tool('ask', async (_, context) => {
    const done = context.wait({ kind: 'question', call: context.call.id, title: 'Which day?' })
    return answered.promise.finally(done)
  })
  const bot = await ask(botCreate, { name: 'Planner', models: { main: { model: 'fake/m' }, quick: {} } })
  await ask(botSend, { bot: bot.id, prompt: 'Plan lunch', clientRequestId: 'one' })
  for (let tries = 0; tries < 200 && (await ask(botList, {})).find(listed => listed.id === bot.id)?.status !== 'waiting'; tries++) await Bun.sleep(10)

  expect((await ask(botList, {})).find(listed => listed.id === bot.id)).toMatchObject({ status: 'waiting' })
  answered.resolve('Friday')
  expect(await settled(bot.id)).toMatchObject({ status: 'idle', last: { text: 'Thanks.' } })
})

test('an image sent to a bot reaches its model after a label with the path it is saved at, as in a thread', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[said('A cat.')]], api: 'anthropic' }], {
    plugins: ['bots/bots', 'bots/turns', 'core/transfers', 'agent/attachments'],
  })
  const store = sand.app.get(media)
  if (!store) throw new Error('No media store')
  const stored = store.put(new Uint8Array([1, 2, 3]), 'image/png')
  const bot = await sand.ask(botCreate, { name: 'Looker', models: { main: { model: 'fake/m' }, quick: {} } })

  await sand.ask(botSend, { bot: bot.id, prompt: [{ type: 'image', name: 'cat.png', ...stored }, said('What is this?')], clientRequestId: 'one' })
  await settled(bot.id)

  const [first] = sand.requests('fake').map(body => JSON.parse(body))
  expect(first.messages[0].content).toMatchObject([said(imageLabel('cat.png', store.path(stored))), { type: 'image' }, said('What is this?')])
})
