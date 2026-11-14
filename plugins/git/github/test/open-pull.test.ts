import { gitMaybe, gitOk } from '@sand/git-runner/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Rest } from '../src/api/client'
import { openPull, type PullGit } from '../src/pulls'

let home: string

afterEach(() => rmSync(home, { recursive: true, force: true }))

const git = (cwd: string, ...args: string[]) => {
  const result = Bun.spawnSync(['git', ...args], { cwd })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString().trim()
}

const runner: PullGit = {
  remoteUrl: dir => gitMaybe(dir, ['remote', 'get-url', 'origin']),
  maybe: gitMaybe,
  ok: gitOk,
}

const start = async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-open-pull-'))
  const origin = join(home, 'origin.git')
  const repo = join(home, 'repo')
  git(home, 'init', '-q', '--bare', '-b', 'main', origin)
  await Bun.write(join(repo, 'notes.txt'), 'one\n')
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'user.name', 'Test')
  git(repo, 'config', 'user.email', 'test@example.com')
  git(repo, 'remote', 'add', 'origin', 'https://github.com/acme/tiles.git')
  git(repo, 'config', 'remote.origin.pushurl', origin)
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'first')
  git(repo, 'switch', '-q', '-c', 'fix/cache')
  await Bun.write(join(repo, 'notes.txt'), 'two\n')
  git(repo, 'commit', '-q', '-am', 'cache fix')
  return { origin, repo }
}

const recording = () => {
  const calls: [string, string, unknown][] = []
  const client: Rest = {
    rest: async <T>(method: string, path: string, body?: unknown) => {
      calls.push([method, path, body])
      const answer = method === 'GET' ? { default_branch: 'main' } : { number: 7, title: 'Fix the cache', state: 'open', draft: false, merged_at: null, html_url: 'https://github.com/acme/tiles/pull/7' }
      return answer as T
    },
  }
  return { client, calls }
}

test('pushes the branch with an upstream, then opens a pull request into the default branch', async () => {
  const { origin, repo } = await start()
  const { client, calls } = recording()

  expect(await openPull(runner, client, repo, 'Fix the cache')).toEqual({ number: 7, title: 'Fix the cache', state: 'open', url: 'https://github.com/acme/tiles/pull/7' })

  expect(git(origin, 'rev-parse', 'fix/cache')).toBe(git(repo, 'rev-parse', 'HEAD'))
  expect(git(repo, 'rev-parse', '--abbrev-ref', '@{upstream}')).toBe('origin/fix/cache')
  expect(calls).toEqual([
    ['GET', '/repos/acme/tiles', undefined],
    ['POST', '/repos/acme/tiles/pulls', { title: 'Fix the cache', head: 'fix/cache', base: 'main' }],
  ])
})

test("refuses a folder whose origin isn't on GitHub and asks GitHub nothing", async () => {
  const { repo } = await start()
  git(repo, 'remote', 'set-url', 'origin', 'https://gitlab.com/acme/tiles.git')
  const { client, calls } = recording()

  await expect(openPull(runner, client, repo, 'Fix the cache')).rejects.toThrow("This folder isn't on a branch of a GitHub repo.")
  expect(calls).toEqual([])
})
