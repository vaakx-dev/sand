import { memoryRead, memoryWrite } from '@sand/bot-memory/contract'
import { botConversation, botCreate, botDelete, botGet, type BotEntry, type BotStatus } from '@sand/bots/contract'
import { botInterrupt, botLive, botSend } from '@sand/bot-turns/contract'
import type { Message } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, setSystemTime, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const start = async (replies: Source['replies']) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], { plugins: ['bots/bots', 'bots/memory', 'bots/turns'] })
  return sand
}

const settled = async (bot: string, want: BotStatus = 'idle') => {
  for (let tries = 0; tries < 200; tries++) {
    const found = await sand.ask(botGet, { bot })
    if (found?.status === want && found.last?.role === 'assistant') return found
    await Bun.sleep(10)
  }
  throw new Error(`Bot ${bot} never became ${want}`)
}

const messages = (entries: BotEntry[]) => entries.flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : []))

test('a message to a bot runs a turn on its own conversation with its job, memory and model, and it can save to memory', async () => {
  const { ask, requests } = await start([[said('Noting that.'), { type: 'call', name: 'memory_write', input: { name: 'people.md', text: '# People\n\nAna: lunch Fridays.' } }], [said('Saved.')]])
  const bot = await ask(botCreate, { name: 'Calendar', job: 'Keep my calendar.', models: { main: { model: 'fake/m', effort: 'low' }, quick: {} } })
  await ask(memoryWrite, { bot: bot.id, name: 'habits.md', text: 'Gym on Mondays.' })

  expect(await ask(botSend, { bot: bot.id, prompt: 'Lunch with Ana is every Friday', clientRequestId: 'one' })).toMatchObject({ disposition: 'started' })
  expect(await settled(bot.id)).toMatchObject({ status: 'idle', last: { role: 'assistant', text: 'Saved.' } })

  const [first] = requests('fake').map(body => JSON.parse(body))
  const system = first.system[0].text
  expect(system).toContain('You are Calendar')
  expect(system).toContain('Keep my calendar.')
  expect(system).toContain('<memory file="habits.md">\nGym on Mondays.\n</memory>')
  expect(first.tools.map((tool: { name: string }) => tool.name)).toContain('memory_write')
  expect(first.messages).toEqual([
    { role: 'user', content: [expect.objectContaining({ text: expect.stringMatching(/^<time>.+<\/time>$/) }), expect.objectContaining(said('Lunch with Ana is every Friday'))] },
  ])

  const { entries } = await ask(botConversation, { bot: bot.id })
  expect(messages(entries).map(message => message.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
  expect(await ask(memoryRead, { bot: bot.id, name: 'people.md' })).toBe('# People\n\nAna: lunch Fridays.')
  expect(sand.sessions.list()).toEqual([])
})

test('each message reaches the model with the time it was sent, while the system prompt stays the same and holds no date', async () => {
  const { ask, requests } = await start([[said('Noted.')], [said('Sure.')]])
  const bot = await ask(botCreate, { name: 'Diary', models: { main: { model: 'fake/m' }, quick: {} } })
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

  setSystemTime(new Date(2026, 2, 2, 12))
  await ask(botSend, { bot: bot.id, prompt: 'Monday notes', clientRequestId: 'one' })
  await settled(bot.id)
  setSystemTime(new Date(2026, 2, 5, 12))
  await ask(botSend, { bot: bot.id, prompt: 'Thursday notes', clientRequestId: 'two' })
  await settled(bot.id)
  setSystemTime()

  const [first, second] = requests('fake').map(body => JSON.parse(body))
  expect(second.system).toEqual(first.system)
  expect(first.system[0].text).not.toMatch(/Today is|2026/)
  const stamps = second.messages
    .filter((message: Message) => message.role === 'user')
    .map((message: Message) => (message.content[0] as { text: string }).text)
  expect(stamps).toEqual([expect.stringContaining('2 Mar 2026'), expect.stringContaining('5 Mar 2026')])
  expect(stamps[1]).toContain(`(${zone})`)
  expect(await ask(botGet, { bot: bot.id })).toMatchObject({ last: { role: 'assistant', text: 'Sure.' } })
  const { entries } = await ask(botConversation, { bot: bot.id })
  expect(messages(entries)[2]?.content).toEqual([expect.objectContaining({ typed: '' }), said('Thursday notes')])
})

test('a failed turn marks the bot failed, and deleting a bot forgets its turns', async () => {
  const { ask } = await start([[{ type: 'error', message: 'overloaded' }]])
  const bot = await ask(botCreate, { name: 'Errands', models: { main: { model: 'fake/m' }, quick: {} } })
  await ask(botSend, { bot: bot.id, prompt: 'Buy milk', clientRequestId: 'one' })
  for (let tries = 0; tries < 200 && (await ask(botGet, { bot: bot.id }))?.status !== 'failed'; tries++) await Bun.sleep(10)

  expect(await ask(botGet, { bot: bot.id })).toMatchObject({ status: 'failed', last: { role: 'user', text: 'Buy milk' } })
  const { entries } = await ask(botConversation, { bot: bot.id })
  expect(entries.at(-1)).toMatchObject({ type: 'turn-ending', data: { stopReason: 'error' } })

  expect(await ask(botDelete, { bot: bot.id })).toBe(true)
  await expect(ask(botSend, { bot: bot.id, prompt: 'Still there?', clientRequestId: 'two' })).rejects.toThrow(`No bot ${bot.id}`)
})

test('a page that opens mid-reply gets the reply streamed so far, and nothing once the turn ends', async () => {
  const { ask } = await start([[said('Half a '), said('thought'), { type: 'hold' }]])
  const bot = await ask(botCreate, { name: 'Researcher', models: { main: { model: 'fake/m' }, quick: {} } })
  await ask(botSend, { bot: bot.id, prompt: 'Think', clientRequestId: 'one' })
  const streamed = async () => (await ask(botLive, { bot: bot.id })).flatMap(block => (block.type === 'text' ? [block.text] : [])).join('')
  for (let tries = 0; tries < 200 && (await streamed()) !== 'Half a thought'; tries++) await Bun.sleep(10)

  expect(await streamed()).toBe('Half a thought')
  expect(await ask(botInterrupt, { bot: bot.id })).toBe(true)
  for (let tries = 0; tries < 200 && (await ask(botLive, { bot: bot.id })).length; tries++) await Bun.sleep(10)
  expect(await ask(botLive, { bot: bot.id })).toEqual([])
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
  for (let tries = 0; tries < 200 && (await ask(botGet, { bot: bot.id }))?.status !== 'waiting'; tries++) await Bun.sleep(10)

  expect(await ask(botGet, { bot: bot.id })).toMatchObject({ status: 'waiting' })
  answered.resolve('Friday')
  expect(await settled(bot.id)).toMatchObject({ status: 'idle', last: { text: 'Thanks.' } })
})
