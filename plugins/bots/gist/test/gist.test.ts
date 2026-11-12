import { botCreate, botList } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { startSand, type Sand } from '@sand/harness'
import { subModelSet } from '@sand/sub-model/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const reply = 'I checked the greenhouse sensors.\n\nThe east bed read 12% moisture, so I ran the drip line for ten minutes and it now reads 31%.'

test("a finished bot reply gets a one-line gist from the fast sub model, shown with the bot's last line", async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said(reply)], [said('{"gist": "Watered the dry east bed."}')]] }], {
    plugins: ['agent/ask', 'agent/sub-model', 'bots/bots', 'bots/turns', 'bots/gist'],
  })
  await sand.ask(subModelSet, { tier: 'fast', model: { model: 'fake/m' } })
  const bot = await sand.ask(botCreate, { name: 'Gardener', models: { main: { model: 'fake/m' }, quick: {} } })
  await sand.ask(botSend, { bot: bot.id, prompt: 'Check the beds', clientRequestId: 'one' })
  while (!(await sand.ask(botList, {})).find(listed => listed.id === bot.id)?.last?.gist) await Bun.sleep(10)
  const last = (await sand.ask(botList, {})).find(listed => listed.id === bot.id)?.last
  expect(last?.gist).toBe('Watered the dry east bed')
  expect(last?.text).toStartWith('I checked the greenhouse sensors.')
})
