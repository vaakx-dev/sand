import { startSand, type Sand } from '@sand/harness'
import { worktrees, worktreesRemove, worktreesRestore, worktreesThread } from '@sand/worktrees/contract'
import { afterEach, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const git = (cwd: string, ...args: string[]) => {
  const result = Bun.spawnSync(['git', ...args], { cwd, env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString().trim()
}

const makeRepo = async (home: string) => {
  const repo = join(home, 'repo')
  await Bun.write(join(repo, 'tracked.txt'), 'first\n')
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'core.autocrlf', 'false')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'first')
  git(repo, 'branch', 'feature')
  return repo
}

test('a thread started on an existing branch gets its own worktree, and removing it anyway keeps unsaved work for restore', async () => {
  sand = await startSand([], { plugins: ['core/watch', 'git/runner', 'git/git', 'git/worktrees'] })
  const repo = await makeRepo(sand.home)

  const { cwd: path } = await sand.ask(worktreesThread, { cwd: repo, branch: 'feature' })
  expect(path.startsWith(join(sand.home, 'worktrees'))).toBe(true)
  expect(git(path, 'branch', '--show-current')).toBe('feature')

  git(path, 'commit', '-q', '--allow-empty', '-m', 'unpushed')
  const head = git(path, 'rev-parse', 'HEAD')
  await Bun.write(join(path, 'tracked.txt'), 'changed\n')
  await Bun.write(join(path, 'new.txt'), 'untracked\n')

  expect(await sand.ask(worktreesRemove, { path })).toMatchObject({ removed: false, check: { uncommitted: 2, unpushed: 1 } })
  expect(await sand.ask(worktreesRemove, { path, force: true })).toEqual({ removed: true })
  expect(existsSync(path)).toBe(false)
  expect(git(repo, 'stash', 'list')).toBe('')

  await sand.ask(worktreesRestore, { path })
  expect(git(path, 'rev-parse', 'HEAD')).toBe(head)
  expect(await Bun.file(join(path, 'tracked.txt')).text()).toBe('changed\n')
  expect(await Bun.file(join(path, 'new.txt')).text()).toBe('untracked\n')
  expect(git(repo, 'for-each-ref', 'refs/sand')).toBe('')
})

test('an idle thread moves into a new worktree and branch, taking its uncommitted changes', async () => {
  sand = await startSand([], { plugins: ['core/watch', 'git/runner', 'git/git', 'git/worktrees'] })
  const repo = await makeRepo(sand.home)
  await Bun.write(join(repo, 'tracked.txt'), 'changed\n')
  const thread = sand.sessions.thread(repo)

  await sand.app.get(worktrees)!.move(thread.id, 'moved')
  const { cwd } = sand.sessions.require(thread.id)
  expect(cwd.startsWith(join(sand.home, 'worktrees'))).toBe(true)
  expect(git(cwd, 'branch', '--show-current')).toBe('moved')
  expect(await Bun.file(join(cwd, 'tracked.txt')).text()).toBe('changed\n')
  expect(git(repo, 'status', '--porcelain')).toBe('')
})
