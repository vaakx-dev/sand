import { botCreate, botList, bots } from '@sand/bots/contract'
import { ledger } from '@sand/ledger/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const say = async (bot: string, prompt: string) => {
  await sand.turns.send(sand.sessions.require(bot), { prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 200; tries++) {
    const found = (await sand.ask(botList, {})).find(listed => listed.id === bot)
    if (found?.status === 'idle' && found.last?.role === 'assistant' && found.last.at > 0) return found.last.text
    await Bun.sleep(10)
  }
  throw new Error(`${bot} never answered ${prompt}`)
}

const threads = () =>
  sand.app.get(ledger)!.db.query<{ owner: string; generation: number; status: string }, []>('select owner, generation, status from provider_threads order by created').all()

test('a bot on an app plan keeps one native thread in its folder and sends it only what is new', async () => {
  sand = await startSand([{ id: 'n', models: ['m'], replies: [[said('n1')], [said('n2')]] }], { plugins: ['bots/bots', 'bots/turns'] })
  const bot = await sand.ask(botCreate, { name: 'Planner' })

  expect(await say(bot.id, 'one')).toBe('n1')
  expect(await say(bot.id, 'two')).toBe('n2')

  expect(sand.native('n')).toEqual([
    { type: 'open', cwd: sand.app.get(bots)!.folder(bot.id) },
    { type: 'send', text: 'one' },
    { type: 'send', text: 'two' },
  ])
  expect(threads()).toEqual([{ owner: 'bot', generation: 1, status: 'idle' }])
})
