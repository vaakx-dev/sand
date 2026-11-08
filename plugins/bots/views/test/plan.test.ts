import { expect, test } from 'bun:test'
import { parsePlan } from '../src/web/project/plan'

test('a plan splits into linked items, plain items and the prose around them', () => {
  const source = [
    'Shipping the 2.0 release this week.',
    '',
    '## In progress',
    '',
    '- [Fix the login bug](thread:0b6c2e1a): tests running',
    '- [ ] Hotel quote: asked the hotel,',
    '  reply due Friday',
    '* Book the airport transfer',
    '- [Lisbon flights](mail:7f3d) — for you to pick one',
    '',
    '## Notes',
    'Staging is down until Monday.',
  ].join('\n')

  expect(parsePlan(source, ['thread'])).toEqual({
    items: [
      { title: 'Fix the login bug', note: 'tests running', ref: 'thread:0b6c2e1a' },
      { title: 'Hotel quote', note: 'asked the hotel, reply due Friday' },
      { title: 'Book the airport transfer', note: '' },
      { title: 'Lisbon flights', note: 'for you to pick one' },
    ],
    rest: 'Shipping the 2.0 release this week.\n\n## Notes\nStaging is down until Monday.',
  })
})
