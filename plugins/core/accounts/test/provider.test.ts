import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

test('a model named with a provider that has no sign-in fails the turn instead of running on another provider with the same model', async () => {
  sand = await startSand([{ id: 'other', label: 'Other Plan', models: ['m'], replies: [[said('Ran on the wrong plan.')]] }])
  const chat = sand.chat('absent/m')

  await expect(sand.turns.run(chat, 'Go')).rejects.toThrow(/^absent\/m runs only on absent, .*Settings → Accounts, or pick another model\.$/)
  expect(sand.native('other')).toEqual([])
})
