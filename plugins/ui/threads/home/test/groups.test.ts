import { expect, test } from 'bun:test'
import { threadGroups } from '../src/groups'
import type { Entry } from '../src/items/items'

const entry = (id: string, moved: number, extra: Partial<Entry> & { running?: boolean } = {}): Entry => ({
  row: { id, label: id, to: { kind: 'thread', id }, ...(extra.running && { status: 'running' }) },
  moved,
  ...extra,
})

const groups = (entries: Entry[], { limit = 50, start = () => {} }: { limit?: number; start?: () => void } = {}) => threadGroups({ entries, known: true, limit, more: () => {}, start })

const shape = (found: ReturnType<typeof threadGroups>) => found.map(group => [group.id, Boolean(group.folded), group.rows.map(row => row.id)])

test('threads group by state, newest first, with running work in an open Working group and empty groups skipped', () => {
  const entries = [entry('old', 1), entry('new', 3), entry('busy', 2, { running: true }), entry('done', 5, { settled: true }), entry('later', 4, { snoozed: 9 })]
  expect(shape(groups(entries))).toEqual([
    ['active', false, ['new', 'old']],
    ['working', false, ['busy']],
    ['snoozed', true, ['later']],
    ['settled', true, ['done']],
  ])
  expect(groups([entry('a', 1)]).map(group => group.id)).toEqual(['active'])
})

test('the new-thread action stays reachable with no threads at all', () => {
  let ran = 0
  const [group] = groups([], { start: () => ran++ })
  expect(group?.id).toBe('active')
  group?.action?.run()
  expect(ran).toBe(1)
})

test('settled pages behind a show-more action', () => {
  const settled = Array.from({ length: 3 }, (_, at) => entry(`s${at}`, at, { settled: true }))
  const group = groups(settled, { limit: 2 }).find(found => found.id === 'settled')
  expect(group?.rows.map(row => row.id)).toEqual(['s2', 's1'])
  expect(group?.action?.label).toBe('Show 1 more')
})

test('pinned threads lead their group, newest first, then the rest', () => {
  const entries = [entry('a', 4), entry('p1', 1, { pinned: true }), entry('b', 3), entry('p2', 2, { pinned: true }), entry('s', 5, { settled: true, pinned: true }), entry('t', 6, { settled: true })]
  expect(shape(groups(entries))).toEqual([
    ['active', false, ['p2', 'p1', 'a', 'b']],
    ['settled', true, ['s', 't']],
  ])
})

test('the empty text waits until the thread list is known', () => {
  const empty = (known: boolean) => threadGroups({ entries: [], known, limit: 50, more() {}, start() {} })[0]?.empty
  expect(empty(false)).toBeUndefined()
  expect(empty(true)).toBe('No threads yet.')
})
