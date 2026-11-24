import { contextCompact } from '@sand/compaction/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const gate = { type: 'call', name: 'gate' } as const

const firstText = (body: string): string => JSON.parse(body).messages[0].content[0].text

const compactOf = (session: string) => sand.ask(contextCompact, { session, owner: 'thread' })

test('compacting a chat on request needs an idle chat, and its next turn carries on from the summary', async () => {
  sand = await startSand([{ id: 'a', api: 'anthropic', models: ['m'], replies: [[gate], [said('a1')], [said('a2')], [said('the summary')], [said('a3')]] }])
  const chat = sand.chat('a/m')
  const compact = () => compactOf(chat.id)
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

test('compacting a native chat on request makes its next turn start a new session seeded with the summary instead of resuming the old one', async () => {
  const summarized = 'x'.repeat(100_000)
  sand = await startSand([{ id: 'n', models: ['m'], replies: [[said('n1')], [said('n2')], [said('the summary')], [said('n3')]] }])
  const chat = sand.chat('n/m')

  await sand.turns.run(chat, summarized)
  await sand.turns.run(chat, 'two')
  await compactOf(chat.id)
  await sand.turns.run(chat, 'three')

  const calls = sand.native('n')
  expect(calls.slice(-3, -1)).toEqual([{ type: 'close' }, { type: 'open', cwd: sand.home }])
  const seeded = calls.at(-1)
  const text = seeded?.type === 'send' ? seeded.text : ''
  expect(text).toContain('Summary of the earlier conversation:\n\nthe summary')
  expect(text).not.toContain(summarized)
  expect(text).toEndWith('three')
})
