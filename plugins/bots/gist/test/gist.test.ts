import { botCreate, botList } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const reply = 'I checked the greenhouse sensors.\n\nThe east bed read 12% moisture, so I ran the drip line for ten minutes and it now reads 31%.'

test("a finished bot reply gets a one-line gist from a small fast model, shown with the bot's last line", async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said(reply)], [said('{"gist": "Watered the dry east bed."}')]] }], {
    plugins: ['agent/ask', 'bots/bots', 'bots/turns', 'bots/gist'],
  })
  const bot = await sand.ask(botCreate, { name: 'Gardener' })
  await sand.turns.send(sand.sessions.require(bot.id), { prompt: 'Check the beds', clientRequestId: 'one' })
  while (!(await sand.ask(botList, {})).find(listed => listed.id === bot.id)?.last?.gist) await Bun.sleep(10)
  const last = (await sand.ask(botList, {})).find(listed => listed.id === bot.id)?.last
  expect(last?.gist).toBe('Watered the dry east bed')
  expect(last?.text).toStartWith('I checked the greenhouse sensors.')
})

test('while an agent the bot started is working, the gist model is told so, so the line says the bot waits on it and not on the user', async () => {
  const delegate = { type: 'call', name: 'agent', input: { label: 'Fix it', task: 'Fix the login page', does: 'build', background: true } } as const
  sand = await startSand(
    [
      { id: 'fake', api: 'anthropic', models: ['m'], replies: [[delegate], [said('Started an agent on the fix. I will report when the change is in.')]] },
      { id: 'aide', api: 'anthropic', models: ['m'], replies: [[{ type: 'hold' }], [said('{"gist": "Waiting on its agent to finish the fix"}')]] },
    ],
    { plugins: ['agent/ask', 'bots/bots', 'bots/turns', 'bots/gist', 'agent/subagents', 'core/watch'] },
  )
  const bot = await sand.ask(botCreate, { name: 'Fixer' })
  sand.app.get(modelSettings)!.change(sand.sessions.require(bot.id), { model: 'fake/m' })
  await sand.turns.send(sand.sessions.require(bot.id), { prompt: 'Fix the login page', clientRequestId: 'one' })
  while (!(await sand.ask(botList, {})).find(listed => listed.id === bot.id)?.last?.gist) await Bun.sleep(10)
  const listed = (await sand.ask(botList, {})).find(found => found.id === bot.id)
  expect(listed?.subagents).toHaveLength(1)
  expect(listed?.last?.gist).toBe('Waiting on its agent to finish the fix')
  expect(sand.requests('aide').at(-1)).toContain('[An agent the bot started is still working.]')
})
