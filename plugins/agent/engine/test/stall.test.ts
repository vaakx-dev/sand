import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

const said = (text: string) => ({ type: 'text', text }) as const
const hold = { type: 'hold' } as const

let sand: Sand

afterEach(() => sand.stop())

const quickSand = (source: Source) => startSand([source], { options: { accounts: { stream_idle_ms: 300 } } })

test('a model stream that goes silent is dropped and the step tried again', async () => {
  sand = await quickSand({ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said('Half'), hold], [said('Done.')]] })
  const chat = sand.chat('fake/m')

  expect(await sand.turns.run(chat, 'go')).toMatchObject({ stopReason: 'end_turn', text: 'Done.' })
  expect(sand.requests('fake')).toHaveLength(2)
})

test('a model that stays silent on the retry fails the turn, naming the model and the silence', async () => {
  sand = await quickSand({ id: 'fake', models: ['m'], replies: [[said('Hmm'), hold], [hold]] })
  const chat = sand.chat('fake/m')

  await expect(sand.turns.run(chat, 'go')).rejects.toThrow(/fake\/m sent nothing for \d+s/)
  expect(sand.native('fake').filter(call => call.type === 'interrupt')).toHaveLength(2)
})
