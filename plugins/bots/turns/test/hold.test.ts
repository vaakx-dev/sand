import type { UsageRecord } from '@sand/accounts/contract'
import { botLive, botPending, botSend } from '@sand/bot-turns/contract'
import { botCreate, botGet, bots, type BotSummary, botUpdate } from '@sand/bots/contract'
import { type Moment, notify } from '@sand/devices-notify/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const sweep = 2_500

const start = async (replies: Reply[]) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic', price: { input: 1, output: 0, cacheRead: 0, cacheWrite: 0 } }], {
    plugins: ['bots/bots', 'bots/memory', 'bots/turns'],
  })
  return sand
}

const until = async (bot: string, done: (found: BotSummary) => boolean) => {
  for (let tries = 0; tries < 500; tries++) {
    const found = await sand.ask(botGet, { bot })
    if (found && done(found)) return found
    await Bun.sleep(10)
  }
  throw new Error(`${bot} never got there`)
}

const answered = (text: string) => (found: BotSummary) => found.status === 'idle' && found.last?.text === text

const spend = (bot: string, input: number, billing: UsageRecord['billing']) =>
  sand.app
    .get(bots)!
    .conversation(bot)
    .append('usage', { id: Bun.randomUUIDv7(), model: 'fake/m', source: 'fake', billing, usage: { input, output: 0, cacheRead: 0, cacheWrite: 0 } } satisfies UsageRecord)

test('pausing a bot stops its turn, and what is sent to it meanwhile waits until it is resumed', async () => {
  await start([[said('Half'), { type: 'hold' }], [said('Done.')]])
  const bot = await sand.ask(botCreate, { name: 'Errands', models: { main: { model: 'fake/m' }, quick: {} } })
  await sand.ask(botSend, { bot: bot.id, prompt: 'Think', clientRequestId: 'one' })
  for (let tries = 0; tries < 500 && !(await sand.ask(botLive, { bot: bot.id })).length; tries++) await Bun.sleep(10)

  expect(await sand.ask(botUpdate, { bot: bot.id, patch: { paused: true } })).toMatchObject({ paused: true, hold: 'paused' })
  await until(bot.id, found => found.status === 'idle')
  expect(await sand.ask(botSend, { bot: bot.id, prompt: 'Then this', clientRequestId: 'two' })).toMatchObject({ disposition: 'queued' })
  await Bun.sleep(sweep)
  expect(sand.requests('fake')).toHaveLength(1)
  expect(await sand.ask(botPending, { bot: bot.id })).toEqual([expect.objectContaining({ kind: 'queue', prompt: 'Then this' })])

  await sand.ask(botUpdate, { bot: bot.id, patch: { paused: false } })
  await until(bot.id, answered('Done.'))
  expect(sand.requests('fake')).toHaveLength(2)
  expect(await sand.ask(botPending, { bot: bot.id })).toEqual([])
})

test('a bot that spends its monthly limit in API money holds new work and says so once, and a higher limit lets it go on; plan usage costs nothing', async () => {
  await start([[said('Planned.'), { type: 'usage', input: 3_000_000, output: 0 }], [said('Booked.')]])
  const told: Moment[] = []
  sand.app.provide(notify, { send: async moment => void told.push(moment) })
  const bot = await sand.ask(botCreate, { name: 'Travel', budget: 2, models: { main: { model: 'fake/m' }, quick: {} } })

  await sand.ask(botSend, { bot: bot.id, prompt: 'Plan a trip', clientRequestId: 'one' })
  const planned = await until(bot.id, answered('Planned.'))
  expect(planned.spent).toBe(0)
  expect(planned.hold).toBeUndefined()

  spend(bot.id, 1_500_000, 'api')
  spend(bot.id, 500_000, 'credits')
  spend(bot.id, 1_000_000, 'api')
  expect(await sand.ask(botGet, { bot: bot.id })).toMatchObject({ spent: 3, hold: 'limit' })
  expect(told).toEqual([expect.objectContaining({ kind: 'paused', title: 'Travel' })])

  expect(await sand.ask(botSend, { bot: bot.id, prompt: 'Book it', clientRequestId: 'two' })).toMatchObject({ disposition: 'queued' })
  await Bun.sleep(sweep)
  expect(sand.requests('fake')).toHaveLength(1)

  await sand.ask(botUpdate, { bot: bot.id, patch: { budget: 5 } })
  expect(await until(bot.id, answered('Booked.'))).toMatchObject({ spent: 3 })
  expect(told).toHaveLength(1)
})
