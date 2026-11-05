import type { ContextRecord } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import { contextFormats, contextMime, pastedRecords } from '../src/contract'

const notes: ContextRecord = { v: 1, id: 'n1', kind: 'file', label: 'notes.md', data: { path: 'docs/notes.md' } }
const plan: ContextRecord = { v: 1, id: 't1', kind: 'thread', label: 'Release "plan" </pre>', data: { id: 'abc' } }
const text = 'Check [notes.md](sand-context://v1/file/n1) <b>against</b> [Release "plan" </pre>](sand-context://v1/thread/t1)'

const reader = (formats: Record<string, string>) => (type: string) => formats[type] ?? ''

const fragment = (value: unknown) => reader({ [contextMime]: JSON.stringify(value) })

test('copied records paste back from the custom type, or from the HTML when only that survives', () => {
  const formats = contextFormats(text, [plan, { ...notes, id: 'unused' }, notes])

  expect(pastedRecords(reader(formats))).toEqual([notes, plan])
  expect(pastedRecords(reader({ 'text/html': `<meta charset="utf-8">${formats['text/html']}` }))).toEqual([notes, plan])
  expect(formats['text/html']?.match(/<\/?[a-z]+/g)).toEqual(['<pre', '</pre'])
})

test('text without linked records copies as plain text only, and plain text pastes no records', () => {
  expect(contextFormats('no links here', [notes])).toEqual({})
  expect(contextFormats(text, [])).toEqual({})
  expect(pastedRecords(reader({ 'text/plain': text }))).toEqual([])
})

test('a hostile or broken fragment gives no records, and bad records are dropped one by one', () => {
  const broken = [
    reader({ [contextMime]: '{"v":1,"records":[' }),
    fragment({ v: 2, records: [notes] }),
    fragment({ records: [notes] }),
    fragment({ v: 1, records: { 0: notes } }),
    fragment({ v: 1, records: Array.from({ length: 101 }, (_, index) => ({ ...notes, id: `n${index}` })) }),
    fragment([notes]),
    fragment(null),
    reader({ [contextMime]: JSON.stringify({ v: 1, records: [notes] }).padEnd(1_000_001) }),
    reader({ 'text/html': '<pre data-sand-context="%E0%A4%A">x</pre>' }),
    reader({ 'text/html': '<pre data-sand-context="%7B">x</pre>' }),
  ]
  expect(broken.map(pastedRecords)).toEqual(broken.map(() => []))

  const mixed = [
    notes,
    { ...notes, label: 'second copy of n1' },
    { ...plan, v: 2 },
    { ...plan, id: 'Bad ID' },
    { ...plan, kind: 'Thread' },
    { ...plan, data: ['abc'] },
    { ...plan, data: null },
    { ...plan, label: 7 },
    '__proto__',
    plan,
  ]
  expect(pastedRecords(fragment({ v: 1, records: mixed }))).toEqual([notes, plan])
})
