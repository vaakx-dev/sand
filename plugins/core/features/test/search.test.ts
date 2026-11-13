import { expect, test } from 'bun:test'
import type { Addon } from '../src/contract'
import { searchAddons } from '../src/web/search'

const addon = (id: string, label: string, summary: string, readme = ''): Addon => ({ id, label, summary, readme, pictures: [], status: 'available' })

const addons = [
  addon('logbook', 'Logbook', 'A dated record of finished work', 'Weekly progress notes for a thesis'),
  addon('math', 'Math', 'Typesets LaTeX formulas in replies'),
  addon('calendar', 'Calendar', 'Your calendars in one place', 'Lectures, labs and deadlines, and a thesis check-in'),
]

test('search matches every word in the name, summary or README, with name matches first', () => {
  expect(searchAddons(addons, 'thesis').map(found => found.id)).toEqual(['logbook', 'calendar'])
  expect(searchAddons(addons, 'CALENDAR thesis').map(found => found.id)).toEqual(['calendar'])
  expect(searchAddons(addons, 'latex replies').map(found => found.id)).toEqual(['math'])
  expect(searchAddons(addons, 'oscilloscope')).toEqual([])
  expect(searchAddons(addons, '  ')).toEqual(addons)
})
