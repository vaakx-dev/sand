import { expect, test } from 'bun:test'
import { pullOf, pullRecord, pullUrl, type PullSnapshot } from '../src/pull'
import { pickPulls } from '../src/web/pick'

const pull = (number: number, title: string, repo = 'acme/app'): PullSnapshot => ({ repo, number, title, state: 'open' })

test('a linked pull request reads back from its record, and broken snapshots read as nothing', () => {
  const linked = pullRecord(pull(133, 'Context chips'))

  expect(linked).toMatchObject({ kind: 'pull', label: '#133' })
  expect(pullOf(linked)).toEqual(pull(133, 'Context chips'))
  expect(pullOf({ ...linked, data: { ...linked.data, number: '133' } })).toBeUndefined()
  expect(pullOf({ ...linked, data: { ...linked.data, state: 'reopened' } })).toBeUndefined()
  expect(pullOf({ ...linked, data: {} })).toBeUndefined()
  expect(pullOf({ ...linked, data: { ...linked.data, repo: 'evil.example/acme/app' } })).toBeUndefined()
})

test('a pull request opens on GitHub whatever URL its record carries', () => {
  const forged = { ...pullRecord(pull(133, 'Context chips')), data: { repo: 'acme/app', number: 133, title: 'Context chips', state: 'open', url: 'https://evil.example/' } }

  expect(pullUrl(pullOf(forged)!)).toBe('https://github.com/acme/app/pull/133')
})

test('pull requests show once each, the thread’s own first, and match by number or title', () => {
  const pulls = [pull(133, 'Context chips'), pull(12, 'Fix login'), pull(133, 'Context chips (inbox copy)'), pull(133, 'Other repo', 'acme/web')]

  expect(pickPulls(pulls, '').map(found => found.title)).toEqual(['Context chips', 'Fix login', 'Other repo'])
  expect(pickPulls(pulls, '13').map(found => `${found.repo}#${found.number}`)).toEqual(['acme/app#133', 'acme/web#133'])
  expect(pickPulls(pulls, 'login').map(found => found.number)).toEqual([12])
})
