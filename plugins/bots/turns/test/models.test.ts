import { botCreate, botList, bots, botUpdate } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { ledger } from '@sand/ledger/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const app = (replies: Source['replies']): Source => ({ id: 'n', models: ['m'], replies })

const handoff = /^Earlier messages of this chat, [^]*\ntwo$/

const start = async (sources: Source[]) => {
  sand = await startSand(sources, { plugins: ['bots/bots', 'bots/memory', 'bots/turns'] })
  return sand
}

const say = async (bot: string, prompt: string) => {
  await sand.ask(botSend, { bot, prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 200; tries++) {
    const found = (await sand.ask(botList, {})).find(listed => listed.id === bot)
    if (found?.status === 'idle' && found.last?.role === 'assistant') return found.last.text
    await Bun.sleep(10)
  }
  throw new Error(`${bot} never answered ${prompt}`)
}

const threads = () =>
  sand.app.get(ledger)!.db.query<{ owner: string; generation: number; status: string }, []>('select owner, generation, status from provider_threads order by created').all()

const sent = () => sand.native('n').flatMap(call => (call.type === 'send' ? [call.text] : []))

test('a bot on an app plan keeps one native thread in its folder and sends it only what is new', async () => {
  await start([app([[said('n1')], [said('n2')]])])
  const bot = await sand.ask(botCreate, { name: 'Planner', models: { main: { model: 'n/m' }, quick: {} } })

  expect(await say(bot.id, 'one')).toBe('n1')
  expect(await say(bot.id, 'two')).toBe('n2')

  expect(sand.native('n')).toEqual([
    { type: 'open', cwd: sand.app.get(bots)!.folder(bot.id) },
    { type: 'send', text: 'one' },
    { type: 'send', text: 'two' },
  ])
  expect(threads()).toEqual([{ owner: 'bot', generation: 1, status: 'idle' }])
})

test('a bot switched to an app plan hands the new model what was said before', async () => {
  await start([{ id: 'a', api: 'anthropic', models: ['m'], replies: [[said('a1')]] }, app([[said('n1')]])])
  const bot = await sand.ask(botCreate, { name: 'Planner', models: { main: { model: 'a/m' }, quick: {} } })

  expect(await say(bot.id, 'one')).toBe('a1')
  await sand.ask(botUpdate, { bot: bot.id, patch: { models: { main: { model: 'n/m' }, quick: {} } } })
  expect(await say(bot.id, 'two')).toBe('n1')

  expect(sent()).toHaveLength(1)
  expect(sent()[0]).toMatch(handoff)
  expect(sent()[0]).toContain('a1')
  expect(threads().map(thread => thread.owner)).toEqual(['bot', 'bot'])
})
