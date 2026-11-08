import { expect, test } from 'bun:test'
import { threadGroups } from '../src/groups'
import type { Entry } from '../src/items/items'

const entry = (id: string, moved: number, extra: Partial<Entry> & { running?: boolean } = {}): Entry => ({
  row: { id, label: id, to: { kind: 'thread', id }, ...(extra.running && { status: 'running' }) },
  moved,
  ...extra,
})

const shape = (groups: ReturnType<typeof threadGroups>) => groups.map(group => [group.id, Boolean(group.folded), group.rows.map(row => row.id)])

test('threads group by state, newest first, skipping empty groups', () => {
  const entries = [entry('old', 1), entry('new', 3), entry('busy', 2, { running: true }), entry('done', 5, { settled: true }), entry('later', 4, { snoozed: 9 })]
  expect(shape(threadGroups(entries, 50, () => {}))).toEqual([
    ['active', false, ['new', 'old']],
    ['working', true, ['busy']],
    ['snoozed', true, ['later']],
    ['settled', true, ['done']],
  ])
  expect(threadGroups([entry('a', 1)], 50, () => {}).map(group => group.id)).toEqual(['active'])
})

test('settled pages behind a show-more action', () => {
  const settled = Array.from({ length: 3 }, (_, at) => entry(`s${at}`, at, { settled: true }))
  const [group] = threadGroups(settled, 2, () => {})
  expect(group?.rows.map(row => row.id)).toEqual(['s2', 's1'])
  expect(group?.action?.label).toBe('Show 1 more')
})

test('pinned threads lead their group, newest first, then the rest', () => {
  const entries = [entry('a', 4), entry('p1', 1, { pinned: true }), entry('b', 3), entry('p2', 2, { pinned: true }), entry('s', 5, { settled: true, pinned: true }), entry('t', 6, { settled: true })]
  expect(shape(threadGroups(entries, 50, () => {}))).toEqual([
    ['active', false, ['p2', 'p1', 'a', 'b']],
    ['settled', true, ['s', 't']],
  ])
})
