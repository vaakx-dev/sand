import { expect, test } from 'bun:test'
import { pickThreads, type Listed } from '../src/pick'

const thread = (id: string, title: string, updated: number, kind: Listed['kind'] = 'thread'): Listed => ({ id, title, updated, kind, cwd: '/work' })

const threads = [
  thread('old', 'Release plan', 1),
  thread('new', 'Fix the release script', 5),
  thread('here', 'Release notes', 9),
  thread('agent', 'Release checker', 8, 'agent'),
  thread('blank', '', 7),
  thread('quick', 'Quick question', 3, 'quick'),
]

test('lists the other linkable threads, newest first, and ranks matches by how well the title fits', () => {
  expect(pickThreads(threads, '', 'here').map(found => found.id)).toEqual(['new', 'quick', 'old'])
  expect(pickThreads(threads, 'release', 'here').map(found => found.id)).toEqual(['old', 'new'])
  expect(pickThreads(threads, 'qq', 'here').map(found => found.id)).toEqual(['quick'])
  expect(pickThreads(threads, 'zzz')).toEqual([])
})
