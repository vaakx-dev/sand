import { expect, test } from 'bun:test'
import { recent } from '../src/places'

const MINUTE_MS = 60_000

const places = [
  { label: 'Fix the flaky cache test', meta: 'harbor', at: 12 * MINUTE_MS },
  { label: 'Atlas', meta: 'Bot · harbor', at: 50 * MINUTE_MS },
  { label: 'Speed up PNG encoding', meta: 'ledger', at: 5 * MINUTE_MS },
  { label: 'Quill', meta: 'Bot · tide-tables', at: 30 * MINUTE_MS },
]

test('bots and threads are listed newest first and narrowed by every word typed, in their names or projects', () => {
  expect(recent(places, '').map(place => place.label)).toEqual(['Atlas', 'Quill', 'Fix the flaky cache test', 'Speed up PNG encoding'])
  expect(recent(places, 'harbor').map(place => place.label)).toEqual(['Atlas', 'Fix the flaky cache test'])
  expect(recent(places, ' bot  TIDE ').map(place => place.label)).toEqual(['Quill'])
})
