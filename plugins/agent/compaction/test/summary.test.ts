import { startSand, type Sand } from '@sand/harness'
import { scriptEntry } from '@sand/scripts/contract'
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

test('files changed or read by calls inside a script are listed in the summary', async () => {
  sand = await startSand([api([[said('a1')], [said('a2')], [overflow], [said('summary')], [said('a3')]])])
  const chat = sand.chat('a/m')
  await sand.turns.run(chat, 'one')
  const call = (id: string, name: string, path: string) => ({ call: { type: 'tool_call', id, name, input: { path } } })
  const calls = [call('s1.0', 'edit', 'src/a.ts'), call('s1.1', 'read', 'src/b.ts')]
  chat.append(scriptEntry, { id: 's1', thread: chat.id, title: 'edit', code: '', status: 'done', started: 0, calls })
  for (const prompt of ['two', 'three']) await sand.turns.run(chat, prompt)

  expect(chat.latest('compaction')?.data).toMatchObject({ files: { read: ['src/b.ts'], modified: ['src/a.ts'] } })
})
