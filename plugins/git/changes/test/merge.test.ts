import { changesList, changesMerge } from '@sand/changes/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { mergeTool } from '../src/tool'

let sand: Sand

afterEach(() => sand.stop())

const git = (cwd: string, ...args: string[]) => {
  const result = Bun.spawnSync(['git', ...args], { cwd })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString().trim()
}

const start = async () => {
  sand = await startSand([], { plugins: ['core/watch', 'git/runner', 'git/git', 'git/diff', 'git/changes'] })
  const repo = join(sand.home, 'repo')
  await Bun.write(join(repo, 'notes.txt'), 'one\ntwo\nthree\n')
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'core.autocrlf', 'false')
  git(repo, 'config', 'user.name', 'Test')
  git(repo, 'config', 'user.email', 'test@example.com')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'first')
  const worktree = join(sand.home, 'worktree')
  git(repo, 'worktree', 'add', '-q', '-b', 'work', worktree)
  const thread = sand.sessions.thread(worktree)
  sand.sessions.rename(thread.id, 'Tidy the notes')
  return { repo, thread: thread.id, worktree }
}

test("a thread's committed and uncommitted work is ready, and merging squashes it onto the project's branch and archives the thread", async () => {
  const { repo, thread, worktree } = await start()
  const before = git(repo, 'rev-parse', 'HEAD')
  await Bun.write(join(worktree, 'notes.txt'), 'one\n2\nthree\n')
  git(worktree, 'commit', '-q', '-am', 'second line')
  await Bun.write(join(worktree, 'todo.txt'), 'later\n')

  expect(await sand.ask(changesList, {})).toEqual([
    {
      session: thread,
      project: null,
      state: 'ready',
      files: [expect.objectContaining({ path: 'notes.txt', add: 1, del: 1 }), expect.objectContaining({ path: 'todo.txt', add: 1, del: 0 })],
      add: 2,
      del: 1,
    },
  ])

  const asThread = sand.askAs({ device: 'sand', kind: 'agent', actor: { owner: 'thread', id: thread } })
  const merged = await mergeTool.run({}, { call: asThread })
  expect(merged).toMatchObject({ session: thread, state: 'merged', add: 2, del: 1 })

  expect(git(repo, 'log', '-1', '--format=%s %P')).toBe(`Tidy the notes ${before}`)
  expect(await Bun.file(join(repo, 'notes.txt')).text()).toBe('one\n2\nthree\n')
  expect(await Bun.file(join(repo, 'todo.txt')).text()).toBe('later\n')
  expect(git(repo, 'status', '--porcelain')).toBe('')
  expect(sand.sessions.require(thread).archived).not.toBeNull()
  expect(git(worktree, 'rev-parse', 'HEAD')).toBe(git(repo, 'rev-parse', 'HEAD'))
  expect(await sand.ask(changesList, { sessions: [thread] })).toEqual([expect.objectContaining({ state: 'merged', commit: git(repo, 'rev-parse', 'HEAD') })])
})

test('a dirty project folder is refused and a conflict ends in conflict, and neither loses work', async () => {
  const { repo, thread, worktree } = await start()
  await Bun.write(join(worktree, 'notes.txt'), 'one\nthread\nthree\n')
  await Bun.write(join(repo, 'notes.txt'), 'one\nproject\nthree\n')

  await expect(sand.ask(changesMerge, { session: thread })).rejects.toThrow('The project folder has uncommitted changes in 1 file')
  expect(await Bun.file(join(repo, 'notes.txt')).text()).toBe('one\nproject\nthree\n')

  git(repo, 'commit', '-q', '-am', 'project edit')
  const head = git(repo, 'rev-parse', 'HEAD')
  const conflict = { session: thread, state: 'conflict', reason: expect.stringContaining('notes.txt') }
  expect(await sand.ask(changesList, {})).toEqual([expect.objectContaining(conflict)])
  expect(await sand.ask(changesMerge, { session: thread })).toMatchObject(conflict)

  expect(git(repo, 'rev-parse', 'HEAD')).toBe(head)
  expect(git(repo, 'status', '--porcelain')).toBe('')
  expect(git(worktree, 'show', 'HEAD:notes.txt')).toBe('one\nthread\nthree')
  expect(sand.sessions.require(thread).archived).toBeNull()

  await sand.sessions.archive(thread, true)
  expect(await sand.ask(changesList, { sessions: [thread] })).toEqual([expect.objectContaining({ session: thread, state: 'none' })])
})

test("work already squashed onto the project's branch counts as merged, and only the rest is left to merge", async () => {
  const { repo, thread, worktree } = await start()
  await Bun.write(join(worktree, 'notes.txt'), 'one\n2\nthree\n')
  git(worktree, 'commit', '-q', '-am', 'second line')
  await Bun.write(join(worktree, 'notes.txt'), 'one\n2\n3\n')
  git(worktree, 'commit', '-q', '-am', 'third line')
  await Bun.write(join(repo, 'notes.txt'), 'one\n2\n3\n')
  git(repo, 'commit', '-q', '-am', 'Tidy the notes (#1)')
  await Bun.write(join(repo, 'notes.txt'), 'one\nzwei\n3\n')
  git(repo, 'commit', '-q', '-am', 'later edit')

  expect(await sand.ask(changesList, { sessions: [thread] })).toEqual([expect.objectContaining({ state: 'merged', files: [expect.objectContaining({ path: 'notes.txt' })] })])

  await Bun.write(join(worktree, 'todo.txt'), 'later\n')
  expect(await sand.ask(changesList, { sessions: [thread] })).toEqual([expect.objectContaining({ state: 'ready', files: [expect.objectContaining({ path: 'todo.txt' })], add: 1, del: 0 })])

  expect(await sand.ask(changesMerge, { session: thread })).toMatchObject({ state: 'merged', add: 1, del: 0 })
  expect(await Bun.file(join(repo, 'notes.txt')).text()).toBe('one\nzwei\n3\n')
  expect(await Bun.file(join(repo, 'todo.txt')).text()).toBe('later\n')
})

test('work squashed upstream together with other changes counts as merged, even when the local branch is behind', async () => {
  const { repo, thread, worktree } = await start()
  const remote = join(sand.home, 'remote.git')
  git(sand.home, 'init', '-q', '--bare', remote)
  git(repo, 'remote', 'add', 'origin', remote)
  git(repo, 'config', 'branch.main.remote', 'origin')
  git(repo, 'config', 'branch.main.merge', 'refs/heads/main')
  git(repo, 'checkout', '-q', '-b', 'upstream')
  await Bun.write(join(repo, 'notes.txt'), 'a\nb\nc\nd\ne\nf\ng\n')
  git(repo, 'commit', '-q', '-am', 'letters')
  git(worktree, 'reset', '-q', '--hard', 'upstream')
  await Bun.write(join(worktree, 'notes.txt'), 'a\nb\nc\nd\ne\nf\nG\n')
  git(worktree, 'commit', '-q', '-am', 'last letter')
  await Bun.write(join(repo, 'notes.txt'), 'A\nb\nc\nd\ne\nf\ng\n')
  git(repo, 'commit', '-q', '-am', 'first letter')
  await Bun.write(join(repo, 'notes.txt'), 'A\nb\nc\nd\ne\nf\nG\n')
  git(repo, 'commit', '-q', '-am', 'Tidy the notes (#2)')
  git(repo, 'push', '-q', 'origin', 'upstream:main')
  git(repo, 'fetch', '-q', 'origin')
  git(repo, 'checkout', '-q', 'main')
  git(repo, 'branch', '-q', '-D', 'upstream')

  expect(await sand.ask(changesList, { sessions: [thread] })).toEqual([expect.objectContaining({ state: 'merged', files: [expect.objectContaining({ path: 'notes.txt' })] })])
})
