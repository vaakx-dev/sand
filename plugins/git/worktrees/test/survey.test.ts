import { startSand, type Sand } from '@sand/harness'
import { worktrees, worktreesSizes, worktreesStatus } from '@sand/worktrees/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const git = (cwd: string, ...args: string[]) => {
  const result = Bun.spawnSync(['git', ...args], { cwd, env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString().trim()
}

const makeRepo = async (home: string, name: string) => {
  const repo = join(home, name)
  await Bun.write(join(repo, 'tracked.txt'), 'first\n')
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'core.autocrlf', 'false')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'first')
  return repo
}

test('the survey reports every worktree across repos, with its unsaved work and its size on disk', async () => {
  sand = await startSand([], { plugins: ['core/watch', 'git/runner', 'git/git', 'git/worktrees'] })
  const repos = [await makeRepo(sand.home, 'one'), await makeRepo(sand.home, 'two')]
  const thread = sand.app.get(worktrees)!.thread
  const paths = [(await thread({ cwd: repos[0]! })).cwd, (await thread({ cwd: repos[0]! })).cwd, (await thread({ cwd: repos[1]! })).cwd]
  const [dirty] = paths
  mkdirSync(join(dirty!, 'deep', 'er'), { recursive: true })
  await Bun.write(join(dirty!, 'deep', 'er', 'notes.txt'), 'twelve bytes')

  const statuses = await sand.ask(worktreesStatus, {})
  expect(statuses.map(status => status.path).toSorted()).toEqual(paths.toSorted())
  expect(statuses.find(status => status.path === dirty)?.check).toEqual({ running: false, uncommitted: 1, unpushed: 0 })

  const gitFile = (path: string) => statSync(join(path, '.git')).size
  const sizes = await sand.ask(worktreesSizes, {})
  expect(sizes).toEqual(Object.fromEntries(paths.map(path => [path, 'first\n'.length + gitFile(path) + (path === dirty ? 'twelve bytes'.length : 0)])))
})
