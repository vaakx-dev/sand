import { botSend } from '@sand/bot-turns/contract'
import { botCreate, botGet } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { server } from '@sand/server/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { planChangeWire, planRead, planWrite } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string): Reply => [{ type: 'text', text }]

const use = (name: string, input: Record<string, unknown>): Reply => [{ type: 'call', name, input }]

const plan = '## In progress\n- Booking the Lisbon flights: thread "Lisbon trip", comparing fares\n'

const start = async (replies: Reply[]) => {
  sand = await startSand([{ id: 'fake', models: ['b'], replies, api: 'anthropic' }], {
    plugins: ['agent/mcp-server', 'bots/bots', 'bots/memory', 'bots/turns', 'bots/plan'],
  })
  const changes: unknown[] = []
  const hub = sand.app.get(server)
  if (!hub) throw new Error('server did not start')
  hub.broadcast = (event, payload) => {
    if (event.id === planChangeWire.id) changes.push(payload)
  }
  return changes
}

const talk = async (bot: string, prompt: string) => {
  const before = sand.requests('fake').length
  await sand.ask(botSend, { bot, prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 300; tries++) {
    const found = await sand.ask(botGet, { bot })
    if (sand.requests('fake').length > before && found?.status === 'idle' && found.last?.role === 'assistant') return
    await Bun.sleep(10)
  }
  throw new Error(`${prompt} never got an answer`)
}

test('a bot writes and reads its plan through its tools, the user sees each change, and the plan stays out of its brief', async () => {
  const changes = await start([use('bot_plan_write', { text: plan }), use('bot_plan_read', {}), said('Planned.'), said('Still booking.')])
  const bot = await sand.ask(botCreate, { name: 'Travel', job: 'Be Travel.', models: { main: { model: 'fake/b' }, quick: {} } })

  await talk(bot.id, 'Book my Lisbon flights')
  expect(await Bun.file(join(sand.home, 'bots', bot.id, 'plan.md')).text()).toBe(plan)
  expect(changes).toEqual([[bot.id, plan]])
  expect(await sand.ask(planRead, { bot: bot.id })).toBe(plan)

  await talk(bot.id, 'How is it going?')
  const bodies = sand.requests('fake').map(body => JSON.parse(body))
  expect(bodies[0].tools.map((tool: { name: string }) => tool.name)).toContain('bot_plan_write')
  expect(JSON.stringify(bodies[2].messages.at(-1))).toContain('Booking the Lisbon flights')
  for (const body of bodies) expect(JSON.stringify(body.system)).not.toContain('Booking the Lisbon flights')
  expect(JSON.stringify(bodies[3].messages.at(-1))).not.toContain('Booking the Lisbon flights')
})

test('the user edits a plan by bot, and a plan with no bot named fails', async () => {
  const changes = await start([])
  const bot = await sand.ask(botCreate, { name: 'Travel' })

  await sand.ask(planWrite, { bot: bot.id, text: '## Next\n- Book the hotel\n' })
  expect(await sand.ask(planRead, { bot: bot.id })).toBe('## Next\n- Book the hotel\n')
  expect(changes).toEqual([[bot.id, '## Next\n- Book the hotel\n']])
  await expect(sand.ask(planRead, {})).rejects.toThrow('Name the bot')
  await expect(sand.ask(planWrite, { bot: 'nobody', text: '' })).rejects.toThrow('No bot nobody')
})
