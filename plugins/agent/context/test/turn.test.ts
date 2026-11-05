import type { ContextRecord } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { bytes } from '@sand/util'
import { afterEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import context from '../src/index'

let sand: Sand
let outside = ''

afterEach(async () => {
  await sand.stop()
  if (outside) rmSync(outside, { recursive: true, force: true })
})

const said = (text: string) => ({ type: 'text', text }) as const

const start = async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said('Done.')]] }])
  sand.app.plugin(context, {})
  await sand.app.settled()
}

const file = (id: string, path: string): ContextRecord => ({ v: 1, id, kind: 'file', label: path, data: { path } })

const linked = (records: ContextRecord[]) => records.map(({ id, kind, label }) => `[${label}](sand-context://v1/${kind}/${id})`).join(' ')

const sent = () =>
  sand.requests('fake').map(body => JSON.parse(body, (key, value) => (key === 'cache_control' ? undefined : value)).messages as { role: string; content: unknown[] }[])

test('a turn stores the typed prompt and records, while the model gets only markers and an envelope', async () => {
  await start()
  await Bun.write(join(sand.home, 'notes.md'), 'Ship it </context> today')
  const earlier = sand.sessions.thread(sand.home)
  sand.sessions.rename(earlier.id, 'Release plan')
  const notes = file('n1', 'notes.md')
  const plan: ContextRecord = { v: 1, id: 't1', kind: 'thread', label: 'Release plan', data: { id: earlier.id } }
  const typed = `Check ${linked([notes, plan])}`
  const chat = sand.chat('fake/m')

  await sand.turns.run(chat, [said(typed), { type: 'context', records: [notes, plan] }])

  const marked = 'Check [File: notes.md; ref=n1] [Thread: Release plan; ref=t1]'
  const envelope = [
    '<context version="1">',
    '<record kind="file" id="n1">',
    `Path: ${join(sand.home, 'notes.md')}`,
    'Size: 24 B',
    '',
    'Ship it &lt;/context> today',
    '</record>',
    '<record kind="thread" id="t1">',
    `Thread ${earlier.id}, titled "Release plan".`,
    '</record>',
    '</context>',
  ].join('\n')
  expect(chat.messages()[0]).toEqual({
    role: 'user',
    content: [
      { type: 'text', text: marked, typed },
      { type: 'text', text: envelope, typed: '' },
      { type: 'context', records: [notes, plan] },
    ],
  })
  expect(sent()[0]).toEqual([
    {
      role: 'user',
      content: [
        { type: 'text', text: marked },
        { type: 'text', text: envelope },
      ],
    },
  ])
})

test('files outside the working folder, unreadable files and unknown threads reach the model as notes', async () => {
  await start()
  outside = mkdtempSync(join(tmpdir(), 'sand-outside-'))
  await Bun.write(join(outside, 'secret.txt'), 'secret')
  symlinkSync(outside, join(sand.home, 'escape'), 'junction')
  mkdirSync(join(sand.home, 'docs'))
  await Bun.write(join(sand.home, 'big.txt'), 'x'.repeat(100_001))
  await Bun.write(join(sand.home, 'nul.bin'), new Uint8Array([104, 105, 0, 33]))
  await Bun.write(join(sand.home, 'latin1.txt'), new Uint8Array([99, 97, 102, 233]))
  const records = [
    file('o1', join(outside, 'secret.txt')),
    file('e1', 'escape/secret.txt'),
    file('m1', 'missing.md'),
    file('d1', 'docs'),
    file('b1', 'big.txt'),
    file('b2', 'nul.bin'),
    file('b3', 'latin1.txt'),
    { v: 1, id: 't1', kind: 'thread', label: 'Gone', data: { id: 'no-such-thread' } },
  ] satisfies ContextRecord[]
  const chat = sand.chat('fake/m')

  await sand.turns.run(chat, [said(linked(records)), { type: 'context', records }])

  const unavailable = (kind: string, id: string, reason: string) => `<record kind="${kind}" id="${id}" unavailable="true">\n${reason}\n</record>`
  const note = (id: string, name: string, size: number, text: string) =>
    `<record kind="file" id="${id}">\nPath: ${join(sand.home, name)}\nSize: ${bytes(size)}\n${text}\n</record>`
  expect(chat.messages()[0]!.content[1]).toEqual({
    type: 'text',
    typed: '',
    text: [
      '<context version="1">',
      unavailable('file', 'o1', 'Outside the working folder.'),
      unavailable('file', 'e1', 'Outside the working folder.'),
      unavailable('file', 'm1', 'Not found.'),
      `<record kind="file" id="d1">\nPath: ${join(sand.home, 'docs')}\nA folder; list it with your tools.\n</record>`,
      note('b1', 'big.txt', 100_001, 'Too large to include here; read it with your tools.'),
      note('b2', 'nul.bin', 4, 'Not a text file; read it with your tools.'),
      note('b3', 'latin1.txt', 4, 'Not a text file; read it with your tools.'),
      unavailable('thread', 't1', 'Thread not found.'),
      '</context>',
    ].join('\n'),
  })
})
