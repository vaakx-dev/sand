import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const overflow = { type: 'error', message: 'prompt is too long' } as const

const api = (replies: Source['replies']): Source => ({ id: 'a', api: 'anthropic', models: ['m'], replies })

const firstText = (body: string): string => JSON.parse(body).messages[0].content[0].text

test('a second compaction updates the first summary with only what came after it', async () => {
  sand = await startSand([
    api([[said('a1')], [said('a2')], [overflow], [said('summary one')], [said('a3')], [said('a4')], [overflow], [said('summary two')], [said('a5')]]),
  ])
  const chat = sand.chat('a/m')
  for (const prompt of ['one', 'two', 'three', 'four', 'five']) await sand.turns.run(chat, prompt)

  const update = firstText(sand.requests('a')[7]!)
  expect(update).toContain('<previous-summary>\nsummary one\n</previous-summary>')
  expect(update).toContain('[User]: four')
  expect(update).not.toContain('[User]: one')
  expect(chat.latest('compaction')?.data).toMatchObject({ summary: 'summary two' })
})
