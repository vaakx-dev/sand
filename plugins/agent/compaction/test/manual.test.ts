import { contextCompact } from '@sand/compaction/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const gate = { type: 'call', name: 'gate' } as const

const firstText = (body: string): string => JSON.parse(body).messages[0].content[0].text

test('compacting a chat on request needs an idle chat, and its next turn carries on from the summary', async () => {
  sand = await startSand([{ id: 'a', api: 'anthropic', models: ['m'], replies: [[gate], [said('a1')], [said('a2')], [said('the summary')], [said('a3')]] }])
  const chat = sand.chat('a/m')
  const compact = () => sand.ask(contextCompact, { session: chat.id, owner: 'thread' })
  let refused = ''
  sand.tool('gate', async () => {
    refused = await compact().then(
      () => '',
      (error: Error) => error.message,
    )
    return 'open'
  })
  await sand.turns.run(chat, 'one')
  await sand.turns.run(chat, 'two')

  await compact()
  await sand.turns.run(chat, 'three')

  expect(refused).toContain('middle of a turn')
  expect(firstText(sand.requests('a')[4]!)).toStartWith('Summary of the earlier conversation:\n\nthe summary')
})
