import { expect, test } from 'bun:test'
import type { Client } from '../src/api/client'
import { type PullGit, pullsOf } from '../src/pulls'

const gitAt = (remote: string | undefined, branch: string | undefined): PullGit => ({
  remoteUrl: async () => remote,
  maybe: async () => branch,
  ok: async () => '',
})

const listed = [
  { number: 3, title: 'Open one', state: 'open', draft: false, merged_at: null, html_url: 'https://github.com/acme/tiles/pull/3' },
  { number: 2, title: 'Draft one', state: 'open', draft: true, merged_at: null, html_url: 'https://github.com/acme/tiles/pull/2' },
  { number: 1, title: 'Merged one', state: 'closed', draft: false, merged_at: '2026-01-01T00:00:00Z', html_url: 'https://github.com/acme/tiles/pull/1' },
]

const recording = () => {
  const paths: string[] = []
  const client: Client = { rest: async <T>(_method: string, path: string) => (paths.push(path), listed as T) }
  return { client, paths }
}

test('lists the pull requests of the checked out branch with their state', async () => {
  const { client, paths } = recording()
  const pulls = await pullsOf(gitAt('git@github.com:acme/tiles.git', 'fix/cache'), client, '/work/tiles')
  expect(paths).toEqual(['/repos/acme/tiles/pulls?head=acme%3Afix%2Fcache&state=all&per_page=10'])
  expect(pulls?.map(pull => [pull.number, pull.state])).toEqual([
    [3, 'open'],
    [2, 'draft'],
    [1, 'merged'],
  ])
})

test('reads https remotes', async () => {
  const { client, paths } = recording()
  await pullsOf(gitAt('https://github.com/acme/tiles', 'main'), client, '/work/tiles')
  expect(paths).toEqual(['/repos/acme/tiles/pulls?head=acme%3Amain&state=all&per_page=10'])
})

test('finds nothing to ask without a GitHub remote or a checked out branch', async () => {
  const { client, paths } = recording()
  expect(await pullsOf(gitAt('https://gitlab.com/acme/tiles.git', 'main'), client, '/work/tiles')).toBeNull()
  expect(await pullsOf(gitAt(undefined, 'main'), client, '/work/tiles')).toBeNull()
  expect(await pullsOf(gitAt('git@github.com:acme/tiles.git', undefined), client, '/work/tiles')).toBeNull()
  expect(paths).toEqual([])
})
