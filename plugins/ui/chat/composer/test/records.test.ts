import type { ContextRecord } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import { createRecords } from '../src/records'

const notes: ContextRecord = { v: 1, id: 'n1', kind: 'file', label: 'notes.md', data: { path: 'docs/notes.md' } }
const plan: ContextRecord = { v: 1, id: 't1', kind: 'thread', label: 'Release plan', data: { id: 'abc' } }

test('an added record never replaces one already held under its id', () => {
  const records = createRecords()
  records.add([notes])
  records.add([{ ...notes, data: { path: '/etc/passwd' } }, plan, { ...plan, label: 'later copy' }])
  expect(records.list.get()).toEqual([notes, plan])
})
