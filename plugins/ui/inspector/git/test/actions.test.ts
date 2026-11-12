import type { GitFile, GitRemote, GitRepoLocal } from '@sand/git/contract'
import { expect, test } from 'bun:test'
import { actionsFor, type GitFacts, nextAction, stateText } from '../src/actions'

const file = (path: string): GitFile => ({ path, kind: 'modified', staged: false, unstaged: true, add: 1, del: 0 })

const local = (patch: Partial<GitRepoLocal> = {}): GitRepoLocal => ({
  repo: true,
  root: '/work/tiles',
  prefix: '',
  main: '/work/tiles',
  worktree: false,
  branch: 'fix/cache',
  head: 'abc',
  detached: false,
  defaultBranch: 'main',
  isDefault: false,
  files: [],
  fileCount: 0,
  add: 0,
  del: 0,
  ...patch,
})

const remote = (patch: Partial<GitRemote> = {}): GitRemote => ({ ahead: 0, behind: 0, base: 'origin/main', behindBase: 0, aheadBase: 0, ...patch })

const labels = (facts: GitFacts) => actionsFor(facts).map(action => action.label)

test('lists what applies in menu order and suggests the first step that keeps work', () => {
  const facts = {
    local: local({ worktree: true, files: [file('notes.txt')], fileCount: 1 }),
    remote: remote({ aheadBase: 2, behindBase: 1 }),
    pulls: [],
    mergeInto: 'main',
  }
  expect(labels(facts)).toEqual(['Commit', 'Commit and merge into main', 'Push', 'Open a PR', 'Update from main', 'Discard changes'])
  expect(nextAction(actionsFor(facts))?.label).toBe('Commit')
  expect(stateText(facts)).toBe('2 not pushed')
})

test('a clean pushed branch with an open PR has nothing to do', () => {
  const facts = { local: local(), remote: remote({ upstream: 'origin/fix/cache', aheadBase: 2 }), pulls: [{ number: 3, title: 'Fix', state: 'open' as const, url: '' }] }
  expect(labels(facts)).toEqual([])
  expect(stateText(facts)).toBe('')
})

test('pushes when ahead of the upstream, offers a PR only on GitHub, and only counts changes inside the folder', () => {
  const facts = {
    local: local({ prefix: 'docs/', files: [file('notes.txt')], fileCount: 1 }),
    remote: remote({ upstream: 'origin/fix/cache', ahead: 3, behind: 1, aheadBase: 3 }),
    pulls: null,
  }
  expect(labels(facts)).toEqual(['Push'])
  expect(stateText(facts)).toBe('3 ahead, 1 behind')
})

test('the default branch never offers a PR, and merging with nothing to commit says merge', () => {
  const facts = { local: local({ branch: 'main', isDefault: true }), remote: remote({ aheadBase: 1 }), pulls: [], mergeInto: 'main' }
  expect(labels(facts)).toEqual(['Merge into main', 'Push'])
})
