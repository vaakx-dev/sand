import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

const said = (text: string) => ({ type: 'text', text }) as const
const drop = { type: 'drop' } as const

let sand: Sand

afterEach(() => sand.stop())

test('a connection that drops mid-reply is tried again after a pause, and the turn finishes', async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said('Half'), drop], [said('Done.')]] }])
  const chat = sand.chat('fake/m')

  expect(await sand.turns.run(chat, 'go')).toMatchObject({ stopReason: 'end_turn', text: 'Done.' })
  expect(sand.requests('fake')).toHaveLength(2)
})
