import { gitCommit, gitDiscard, gitPush, gitUpdate } from '@sand/git/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const git = (cwd: string, ...args: string[]) => {
  const result = Bun.spawnSync(['git', ...args], { cwd })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString().trim()
}

const configure = (repo: string) => {
  git(repo, 'config', 'core.autocrlf', 'false')
  git(repo, 'config', 'user.name', 'Test')
  git(repo, 'config', 'user.email', 'test@example.com')
}

const start = async () => {
  sand = await startSand([], { plugins: ['core/watch', 'git/runner', 'git/git'] })
  const origin = join(sand.home, 'origin.git')
  const seed = join(sand.home, 'seed')
  await Bun.write(join(seed, 'notes.txt'), 'one\ntwo\nthree\n')
  git(sand.home, 'init', '-q', '--bare', '-b', 'main', origin)
  git(seed, 'init', '-q', '-b', 'main')
  configure(seed)
  git(seed, 'add', '.')
  git(seed, 'commit', '-q', '-m', 'first')
  git(seed, 'remote', 'add', 'origin', origin)
  git(seed, 'push', '-q', '-u', 'origin', 'main')
  const repo = join(sand.home, 'repo')
  git(sand.home, 'clone', '-q', '-c', 'core.autocrlf=false', origin, repo)
  configure(repo)
  git(repo, 'switch', '-q', '-c', 'work')
  return { origin, seed, repo }
}

const advanceMain = async (seed: string, text: string) => {
  await Bun.write(join(seed, 'notes.txt'), text)
  git(seed, 'commit', '-q', '-am', 'main moves')
  git(seed, 'push', '-q', 'origin', 'main')
}

test('commit takes every change in the folder, new files too, and refuses when there is nothing', async () => {
  const { repo } = await start()
  await Bun.write(join(repo, 'notes.txt'), 'one\n2\nthree\n')
  await Bun.write(join(repo, 'todo.txt'), 'later\n')

  await sand.ask(gitCommit, { cwd: repo, message: 'Tidy the notes' })

  expect(git(repo, 'log', '-1', '--format=%s')).toBe('Tidy the notes')
  expect(git(repo, 'show', '--name-only', '--format=', 'HEAD').split('\n')).toEqual(['notes.txt', 'todo.txt'])
  expect(git(repo, 'status', '--porcelain')).toBe('')
  await expect(sand.ask(gitCommit, { cwd: repo, message: 'Again' })).rejects.toThrow('There are no changes to commit.')
}, 30_000)

test('push sets the upstream the first time and sends new commits after', async () => {
  const { origin, repo } = await start()
  await Bun.write(join(repo, 'todo.txt'), 'later\n')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'todo')

  await sand.ask(gitPush, { cwd: repo })
  expect(git(repo, 'rev-parse', '--abbrev-ref', '@{upstream}')).toBe('origin/work')
  expect(git(origin, 'rev-parse', 'work')).toBe(git(repo, 'rev-parse', 'HEAD'))

  await Bun.write(join(repo, 'todo.txt'), 'now\n')
  git(repo, 'commit', '-q', '-am', 'todo now')
  await sand.ask(gitPush, { cwd: repo })
  expect(git(origin, 'rev-parse', 'work')).toBe(git(repo, 'rev-parse', 'HEAD'))
}, 30_000)

test('update merges the latest default branch from origin, and says when there was nothing new', async () => {
  const { seed, repo } = await start()
  await Bun.write(join(repo, 'todo.txt'), 'later\n')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'todo')
  await advanceMain(seed, 'one\ntwo\nthree\nfour\n')

  expect(await sand.ask(gitUpdate, { cwd: repo })).toEqual({ updated: true })
  expect(await Bun.file(join(repo, 'notes.txt')).text()).toBe('one\ntwo\nthree\nfour\n')
  expect(await Bun.file(join(repo, 'todo.txt')).text()).toBe('later\n')
  expect(await sand.ask(gitUpdate, { cwd: repo })).toEqual({ updated: false })
}, 30_000)

test('an update that conflicts is undone and names the files', async () => {
  const { seed, repo } = await start()
  await Bun.write(join(repo, 'notes.txt'), 'one\nwork\nthree\n')
  git(repo, 'commit', '-q', '-am', 'work edit')
  const head = git(repo, 'rev-parse', 'HEAD')
  await advanceMain(seed, 'one\nmain\nthree\n')

  await expect(sand.ask(gitUpdate, { cwd: repo })).rejects.toThrow('main conflicts with this branch in notes.txt. The merge was undone, so nothing changed.')
  expect(git(repo, 'rev-parse', 'HEAD')).toBe(head)
  expect(git(repo, 'status', '--porcelain')).toBe('')
  expect(existsSync(join(repo, '.git', 'MERGE_HEAD'))).toBe(false)
}, 30_000)

test('discard drops tracked, staged and untracked changes in the folder and leaves the rest of the repo alone', async () => {
  const { repo } = await start()
  const docs = join(repo, 'docs')
  await Bun.write(join(docs, 'guide.txt'), 'guide\n')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'docs')
  await Bun.write(join(docs, 'guide.txt'), 'changed\n')
  await Bun.write(join(docs, 'staged.txt'), 'staged\n')
  git(repo, 'add', 'docs/staged.txt')
  await Bun.write(join(docs, 'drafts', 'loose.txt'), 'loose\n')
  await Bun.write(join(repo, 'notes.txt'), 'kept\n')

  await sand.ask(gitDiscard, { cwd: docs })

  expect(await Bun.file(join(docs, 'guide.txt')).text()).toBe('guide\n')
  expect(existsSync(join(docs, 'staged.txt'))).toBe(false)
  expect(existsSync(join(docs, 'drafts'))).toBe(false)
  expect(git(repo, 'status', '--porcelain')).toBe('M notes.txt')
  await expect(sand.ask(gitDiscard, { cwd: docs })).rejects.toThrow('There are no changes to discard.')
}, 30_000)
