import { expect, test } from 'bun:test'
import { listGroups, type ListEntry } from '../src/groups'

const DAY_MS = 86_400_000
const NOW = 100 * DAY_MS

const entry = (id: string, moved: number, extra: Partial<ListEntry> & { running?: boolean } = {}): ListEntry => ({
  row: { id, label: id, to: { kind: 'thread', id }, ...(extra.running && { status: 'running' }) },
  moved,
  talked: NOW,
  ...extra,
})

const groups = (entries: ListEntry[], { limit = 50, start = () => {}, known = true }: { limit?: number; start?: () => void; known?: boolean } = {}) =>
  listGroups({
    id: 'active',
    label: 'Threads',
    entries,
    settleDays: 3,
    now: NOW,
    action: { label: 'New thread', icon: 'plus', run: start },
    ...(known && { empty: 'No threads yet.' }),
    archived: { limit, more: () => {} },
  })

const shape = (found: ReturnType<typeof listGroups>) => found.map(group => [group.id, Boolean(group.folded), group.rows.map(row => row.id)])

test('entries group by state, newest first, with empty groups skipped', () => {
  const entries = [entry('old', 1), entry('new', 3), entry('busy', 2, { running: true }), entry('done', 5, { archived: true }), entry('later', 4, { snoozed: 9 })]
  expect(shape(groups(entries))).toEqual([
    ['active', false, ['new', 'old']],
    ['working', false, ['busy']],
    ['snoozed', true, ['later']],
    ['archived', true, ['done']],
  ])
  expect(groups([entry('a', 1)]).map(group => group.id)).toEqual(['active'])
})

test('entries not talked to for the settle days go to Settled, dimmed, unless running or pinned', () => {
  const quiet = NOW - 4 * DAY_MS
  const entries = [entry('fresh', 1, { talked: NOW - 2 * DAY_MS }), entry('stale', 2, { talked: quiet }), entry('busy', 3, { talked: quiet, running: true }), entry('kept', 4, { talked: quiet, pinned: true })]
  const found = groups(entries)
  expect(shape(found)).toEqual([
    ['active', false, ['kept', 'fresh']],
    ['working', false, ['busy']],
    ['settled', false, ['stale']],
  ])
  expect(found.find(group => group.id === 'settled')?.rows[0]?.quiet).toBe(true)
  expect(found[0]?.rows.some(row => row.quiet)).toBe(false)
})

test('the new-thread action stays reachable with no threads at all', () => {
  let ran = 0
  const [group] = groups([], { start: () => ran++ })
  expect(group?.id).toBe('active')
  group?.action?.run()
  expect(ran).toBe(1)
})

test('archived pages behind a show-more action', () => {
  const archived = Array.from({ length: 3 }, (_, at) => entry(`s${at}`, at, { archived: true }))
  const group = groups(archived, { limit: 2 }).find(found => found.id === 'archived')
  expect(group?.rows.map(row => row.id)).toEqual(['s2', 's1'])
  expect(group?.action?.label).toBe('Show 1 more')
})

test('pinned threads lead their group, newest first, then the rest', () => {
  const entries = [entry('a', 4), entry('p1', 1, { pinned: true }), entry('b', 3), entry('p2', 2, { pinned: true }), entry('s', 5, { archived: true, pinned: true }), entry('t', 6, { archived: true })]
  expect(shape(groups(entries))).toEqual([
    ['active', false, ['p2', 'p1', 'a', 'b']],
    ['archived', true, ['s', 't']],
  ])
})

test('the empty text waits until the list is known', () => {
  expect(groups([], { known: false })[0]?.empty).toBeUndefined()
  expect(groups([])[0]?.empty).toBe('No threads yet.')
})
