import { expect, test } from 'bun:test'
import type { PaletteItem } from '../src/contract'
import { ranked } from '../src/sheet/rank'

const item = (label: string, extra: Partial<PaletteItem> = {}): PaletteItem => ({ id: label, label, ...extra })

const labels = (items: PaletteItem[]) => items.map(found => found.label)

const unused = () => 0

test('a whole word beats a word prefix, which beats a hit inside a word, and the label beats the detail', () => {
  const items = [
    item('Florentine notes'),
    item('Notes', { detail: 'render queue' }),
    item('Rendering pass'),
    item('Render cache'),
    item('Garden', { detail: 'rendering' }),
  ]
  expect(labels(ranked(items, 'render', unused))).toEqual(['Render cache', 'Rendering pass', 'Notes', 'Garden'])
  expect(labels(ranked(items, 'ren', unused))).toEqual(['Rendering pass', 'Render cache', 'Florentine notes', 'Notes', 'Garden'])
})

test('every word must be found, ignoring case and accents, and short words only match word starts', () => {
  const items = [item('Café menu'), item('Cafe opening hours'), item('Menu planner', { search: 'CAFÉ' }), item('Decaf menu')]
  expect(labels(ranked(items, 'cafe menu', unused))).toEqual(['Café menu', 'Menu planner'])
  expect(labels(ranked(items, 'af', unused))).toEqual([])
})

test('a label that starts with the query comes before the same words elsewhere', () => {
  const items = [item('Fix tile renderer'), item('Tile renderer flicker')]
  expect(labels(ranked(items, 'tile ren', unused))).toEqual(['Tile renderer flicker', 'Fix tile renderer'])
})

test('use reorders equal matches but never lifts an item above a better match', () => {
  const items = [item('Tile cache', { visits: 'a' }), item('Tile notes', { visits: 'b' }), item('Tiles', { visits: 'c' })]
  const used = (visits: string) => (visits === 'a' ? 0 : 1)
  expect(labels(ranked(items, 'tile', used))).toEqual(['Tile notes', 'Tile cache', 'Tiles'])
})

test('ties keep source order and ids made of letters and digits do not match inside', () => {
  const items = [item('Second chat', { search: '7cafe52bb8' }), item('First chat'), item('Third chat')]
  expect(labels(ranked(items, 'chat', unused))).toEqual(['Second chat', 'First chat', 'Third chat'])
  expect(labels(ranked(items, 'cafe', unused))).toEqual([])
  expect(labels(ranked(items, '7cafe', unused))).toEqual(['Second chat'])
})

test('groups keep their order and their own limit', () => {
  const threads = Array.from({ length: 40 }, (_, at) => item(`Thread ${at}`, { id: `thread-${at}`, group: 'Threads' }))
  const projects = [item('Thread tools', { group: 'Projects' })]
  const found = ranked([...threads, ...projects], 'thread', unused)
  expect(found.filter(entry => entry.group === 'Threads')).toHaveLength(30)
  expect(found.at(-1)?.label).toBe('Thread tools')
})
