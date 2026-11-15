import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const start = async (replies: Source['replies']) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }])
  return sand.chat('fake/m')
}

test('an empty reply gets one nudge, then the turn ends', async () => {
  const chat = await start([[{ type: 'thinking', text: 'hmm' }], [{ type: 'thinking', text: 'still hmm' }]])

  const result = await sand.turns.run(chat, 'hello')

  expect(result).toMatchObject({ stopReason: 'end_turn', text: '', steps: 2 })
  const nudges = chat.messages().filter(message => message.role === 'user' && JSON.stringify(message).includes('empty'))
  expect(nudges).toHaveLength(1)
  expect(sand.requests('fake')).toHaveLength(2)
})

test('an empty reply to a notice ends the turn without a nudge', async () => {
  const chat = await start([[{ type: 'thinking', text: 'hmm' }]])

  const result = await sand.turns.run(chat, '<task-notification>done</task-notification>', { origin: 'job' })

  expect(result).toMatchObject({ stopReason: 'end_turn', text: '', steps: 1 })
  expect(sand.requests('fake')).toHaveLength(1)
})
