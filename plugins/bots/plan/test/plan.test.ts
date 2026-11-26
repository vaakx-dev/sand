import { botCreate, botList } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { server } from '@sand/server/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { planChangeWire, planEdit, planLimit, planRead } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string): Reply => [{ type: 'text', text }]

const use = (name: string, input: Record<string, unknown>): Reply => [{ type: 'call', name, input }]

const flights = '- [Book the Lisbon flights](thread:0b6c2e1a): comparing fares\n'

const start = async (replies: Reply[]) => {
  sand = await startSand([{ id: 'fake', models: ['b'], replies, api: 'anthropic' }], {
    plugins: ['agent/mcp-server', 'bots/bots', 'bots/turns', 'bots/plan'],
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
  await sand.turns.send(sand.sessions.require(bot), { prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 300; tries++) {
    const found = (await sand.ask(botList, {})).find(listed => listed.id === bot)
    if (sand.requests('fake').length > before && found?.status === 'idle' && found.last?.role === 'assistant') return
    await Bun.sleep(10)
  }
  throw new Error(`${prompt} never got an answer`)
}

const swap = (old_string: string, new_string: string) => ({ old_string, new_string })

test('a bot sees its plan in every request, edits one item through its tool, and sees the user edit it on its next step', async () => {
  const changes = await start([use('bot_plan_edit', { edits: [swap('- Ask about dates\n', flights)] }), said('Planned.'), said('Booked.')])
  const bot = await sand.ask(botCreate, { name: 'Travel' })
  await sand.ask(planEdit, { bot: bot.id, text: '- Ask about dates\n- Book the hotel\n' })

  await talk(bot.id, 'Book my Lisbon flights')
  const planned = `${flights}- Book the hotel\n`
  expect(await Bun.file(join(sand.home, 'bots', bot.id, 'plan.md')).text()).toBe(planned)
  expect(changes.at(-1)).toEqual([bot.id, planned])

  await sand.ask(planEdit, { bot: bot.id, edits: [swap('comparing fares', 'booked, window seats')] })
  await talk(bot.id, 'Did you get window seats?')
  const bodies = sand.requests('fake').map(body => JSON.parse(body))
  expect(bodies[0].tools.map((tool: { name: string }) => tool.name)).toContain('bot_plan_edit')
  expect(JSON.stringify(bodies[0].system)).toContain('Ask about dates')
  expect(JSON.stringify(bodies[2].system)).toContain('booked, window seats')
})

test('targeted edits change only the lines they name, and a missing or repeated old_string changes nothing', async () => {
  await start([])
  const bot = await sand.ask(botCreate, { name: 'Travel' })
  await sand.ask(planEdit, { bot: bot.id, text: '## Next\n- Book the hotel\n- Pack\n\n## Waiting\n- Visa: on the embassy\n' })

  await sand.ask(planEdit, {
    bot: bot.id,
    edits: [swap('- Book the hotel\n', '- Book the hotel near the river\n'), swap('- Pack\n', ''), swap('- Visa: on the embassy\n', '- Visa: on the embassy\n- Insurance: on a quote\n')],
  })
  const edited = '## Next\n- Book the hotel near the river\n\n## Waiting\n- Visa: on the embassy\n- Insurance: on a quote\n'
  expect(await sand.ask(planRead, { bot: bot.id })).toBe(edited)

  await expect(sand.ask(planEdit, { bot: bot.id, edits: [swap('Visa', 'Passport'), swap('- Rent a car', '')] })).rejects.toThrow(
    'Edit 2 of 2: old_string is not in the plan',
  )
  await expect(sand.ask(planEdit, { bot: bot.id, edits: [swap(': on', ': waiting on')] })).rejects.toThrow('old_string matches 2 times')
  expect(await sand.ask(planRead, { bot: bot.id })).toBe(edited)
})

test('text replaces the whole plan up to the limit, and a plan with no bot named fails', async () => {
  const changes = await start([])
  const bot = await sand.ask(botCreate, { name: 'Travel' })

  await sand.ask(planEdit, { bot: bot.id, text: '## Next\n- Book the hotel\n' })
  expect(await sand.ask(planRead, { bot: bot.id })).toBe('## Next\n- Book the hotel\n')
  expect(changes).toEqual([[bot.id, '## Next\n- Book the hotel\n']])

  const full = `- Pack\n${'x'.repeat(planLimit - 7)}`
  await sand.ask(planEdit, { bot: bot.id, text: full })
  await expect(sand.ask(planEdit, { bot: bot.id, edits: [swap('- Pack', '- Pack light')] })).rejects.toThrow('the limit is 20,000')
  await expect(sand.ask(planEdit, { bot: bot.id, text: `${full}x` })).rejects.toThrow('the limit is 20,000')
  expect(await sand.ask(planRead, { bot: bot.id })).toBe(full)

  await expect(sand.ask(planRead, {})).rejects.toThrow('Name the bot')
  await expect(sand.ask(planEdit, { bot: 'nobody', text: '' })).rejects.toThrow('No bot nobody')
})
