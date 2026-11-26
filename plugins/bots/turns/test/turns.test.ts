import { botMemorySpace } from '@sand/bot-memory/contract'
import { botCreate, botDelete, botList, type BotStatus, type BotSummary, jobCreate } from '@sand/bots/contract'
import { startSand, type Sand, type SandOptions } from '@sand/harness'
import { until } from '@sand/harness/until'
import { memoryWrite } from '@sand/memory/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { resolve } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const start = async (replies: Source['replies'], projects: SandOptions['projects'] = []) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], { plugins: ['agent/memory', 'bots/bots', 'bots/memory', 'bots/turns'], projects })
  return sand
}

const send = (bot: string, prompt: string) => sand.turns.send(sand.sessions.require(bot), { prompt, clientRequestId: prompt })

const reached = (bot: string, done: (found: BotSummary) => boolean) =>
  until(async () => (await sand.ask(botList, {})).find(listed => listed.id === bot && done(listed)))

const statusIs = (status: BotStatus) => (found: BotSummary) => found.status === status

test('a message to a bot runs a turn in its chat with its name, jobs, projects and memory', async () => {
  const { ask, requests } = await start([[said('Noted.')]], [{ project: '0b6c2e1a', name: 'tiles', path: resolve('work', 'tiles') }])
  const bot = await ask(botCreate, { name: 'Calendar', projects: ['family', '0b6c2e1a'] })
  await ask(jobCreate, { bot: bot.id, title: 'Diary', goal: 'Keep my calendar.', done: 'No two events clash.' })
  await ask(memoryWrite, { space: botMemorySpace, id: bot.id, text: 'Gym on Mondays.' })

  await send(bot.id, 'Lunch with Ana is every Friday')
  expect(await reached(bot.id, found => found.status === 'idle' && found.last?.role === 'assistant')).toMatchObject({ last: { text: 'Noted.' } })

  const [first] = requests('fake').map(body => JSON.parse(body))
  const system = first.system[0].text
  expect(system).toStartWith('You are Calendar')
  expect(system).toContain('## Your job')
  expect(system).toContain('## How you work')
  expect(system).toContain('Keep my calendar.')
  expect(system).toContain('No two events clash.')
  expect(system).toContain('<memory>\nGym on Mondays.\n</memory>')
  expect(system).toContain('## Your projects')
  expect(system).toContain('- family: no folder on this PC')
  expect(system).toContain(`- tiles (id 0b6c2e1a): ${resolve('work', 'tiles')}`)
  expect(first.messages).toEqual([{ role: 'user', content: [expect.objectContaining(said('Lunch with Ana is every Friday'))] }])
  expect(sand.sessions.require(bot.id).messages().map(message => message.role)).toEqual(['user', 'assistant'])
})

test('a bot given a job between turns is briefed with it on its next turn', async () => {
  const { ask, requests } = await start([[said('Hi.')], [said('Hi again.')]])
  const bot = await ask(botCreate, { name: 'Calendar' })
  await send(bot.id, 'Hello')
  await reached(bot.id, found => found.last?.text === 'Hi.' && found.status === 'idle')

  await ask(jobCreate, { bot: bot.id, title: 'Diary', goal: 'Keep my calendar.', done: 'No two events clash.' })
  await send(bot.id, 'Hello again')
  await reached(bot.id, found => found.last?.text === 'Hi again.')

  const systems = requests('fake').map(body => JSON.parse(body).system[0].text as string)
  expect(systems.map(system => system.includes('Keep my calendar.'))).toEqual([false, true])
})

test('a failed turn marks the bot failed, and deleting a bot removes its chat', async () => {
  const { ask } = await start([[{ type: 'error', message: 'overloaded' }]])
  const bot = await ask(botCreate, { name: 'Errands' })
  await send(bot.id, 'Buy milk')

  expect(await reached(bot.id, statusIs('failed'))).toMatchObject({ last: { role: 'user', text: 'Buy milk' } })
  expect(sand.sessions.require(bot.id).latest('turn-ending')?.data).toMatchObject({ stopReason: 'error' })

  expect(await ask(botDelete, { bot: bot.id })).toBe(true)
  expect(sand.sessions.open(bot.id)).toBeUndefined()
})

test('a bot whose tool waits on the user is waiting until it answers', async () => {
  const { ask } = await start([[{ type: 'call', name: 'skill' }], [said('Thanks.')]])
  const answered = Promise.withResolvers<string>()
  sand.tool('skill', async (_, context) => {
    const done = context.wait({ kind: 'question', call: context.call.id, title: 'Which day?' })
    return answered.promise.finally(done)
  })
  const bot = await ask(botCreate, { name: 'Planner' })
  await send(bot.id, 'Plan lunch')

  expect(await reached(bot.id, statusIs('waiting'))).toMatchObject({ waiting: 'question' })
  answered.resolve('Friday')
  expect(await reached(bot.id, found => found.status === 'idle' && found.last?.text === 'Thanks.')).toBeDefined()
})
