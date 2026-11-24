import type { Limits, SourceInfo } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { limitsOutdated } from '../src/data/outdated'

const now = Date.UTC(2030, 0, 8, 12)
const secondsAgo = (seconds: number) => now - seconds * 1000

const source = (id: string, billing: SourceInfo['billing'], remote?: { account: string; pc: string }): SourceInfo => ({
  id,
  kind: id,
  label: id,
  provider: id,
  billing,
  ...remote,
  shown: 1,
  total: 1,
  fresh: 0,
  newModels: 'show',
  search: false,
  slugs: true,
})

const limits = (source: string, updated: number, pc?: string): Limits => ({ source, ...(pc && { pc }), windows: [], updated })

test('a signed-in plan with no limits yet makes the limits outdated, even when every other plan just reported', () => {
  const sources = [source('codex', 'plan'), source('agy', 'plan')]
  expect(limitsOutdated({ limits: [limits('codex', secondsAgo(5))], sources, now })).toBe(true)
  expect(limitsOutdated({ limits: [limits('codex', secondsAgo(5)), limits('agy', secondsAgo(5))], sources, now })).toBe(false)
})

test('limits older than a minute are outdated, and so is having none', () => {
  const sources = [source('codex', 'plan')]
  expect(limitsOutdated({ limits: [limits('codex', secondsAgo(61))], sources, now })).toBe(true)
  expect(limitsOutdated({ limits: [], sources: [], now })).toBe(true)
})

test('API-key sources never need limits, and a plan on another PC is matched by its account and PC', () => {
  const sources = [source('openrouter', 'api'), source('claude@desk', 'plan', { account: 'claude', pc: 'desk-pc' })]
  expect(limitsOutdated({ limits: [limits('claude', secondsAgo(5), 'desk-pc')], sources, now })).toBe(false)
  expect(limitsOutdated({ limits: [limits('claude', secondsAgo(5))], sources, now })).toBe(true)
})
