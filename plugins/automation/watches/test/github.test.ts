import type { GitHub } from '@sand/github/contract'
import { afterEach, expect, test } from 'bun:test'
import type { Change, KindContext, Started } from '../src/contract'
import { githubKind } from '../src/kinds/github'

const cleanups: (() => unknown)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

const event = (id: number, type: string, payload: object, at = `2025-01-01T00:00:0${id % 10}Z`) => ({
  id: String(id),
  type,
  actor: { login: 'ann' },
  created_at: at,
  payload,
})

const run = (id: number, attempt: number, conclusion = 'failure') => ({
  id,
  run_attempt: attempt,
  run_number: 7,
  name: 'CI',
  display_title: 'fix it',
  head_branch: 'main',
  conclusion,
  event: 'push',
  html_url: `https://github.com/o/r/actions/runs/${id}`,
  updated_at: `2025-01-02T00:00:0${attempt}Z`,
  actor: { login: 'bob' },
})

const fakeRepo = () => {
  const repo = { events: [] as object[], runs: [] as object[], polls: 0 }
  const github = {
    rest: async (_method: string, path: string) => {
      if (path.includes('/events')) {
        repo.polls++
        return repo.events
      }
      return { workflow_runs: repo.runs }
    },
  } as unknown as GitHub
  return { repo, github }
}

const watching = (github: GitHub, repo: { polls: number }, state?: unknown, input: { events?: string[] } = {}) => {
  const changes: Change[] = []
  const errors: unknown[] = []
  const stopped = new AbortController()
  const context: KindContext = {
    id: 'watch',
    state,
    save: next => void (context.state = next),
    emit: change => void changes.push(change),
    fail: error => void errors.push(error),
    signal: stopped.signal,
  }
  const started = githubKind(github, 10).start({ repo: 'o/r', ...input }, context) as Started | void
  cleanups.push(() => stopped.abort())
  const nextPoll = async () => {
    const target = repo.polls + 1
    const deadline = Date.now() + 5_000
    while (repo.polls < target) {
      if (Date.now() > deadline) throw new Error('timed out')
      await Bun.sleep(5)
    }
    await Bun.sleep(5)
    if (errors.length) throw errors[0]
  }
  return { context, changes, nextPoll, started }
}

test('the first poll stores where things stand and emits nothing', async () => {
  const { repo, github } = fakeRepo()
  repo.events = [event(5, 'PushEvent', { ref: 'refs/heads/main', size: 1 })]
  repo.runs = [run(1, 1)]
  const { context, changes, nextPoll } = watching(github, repo)
  await nextPoll()
  expect(changes).toEqual([])
  expect(context.state).toEqual({ event: '5', runs: ['1.1'] })
})

test('new events are emitted oldest first with created_at and readable summaries', async () => {
  const { repo, github } = fakeRepo()
  repo.events = [event(5, 'PushEvent', { ref: 'refs/heads/main', size: 1 })]
  const { changes, nextPoll } = watching(github, repo)
  await nextPoll()

  repo.events = [
    event(8, 'IssuesEvent', { action: 'opened', issue: { number: 3, title: 'Broken' } }, '2025-01-01T00:00:08Z'),
    event(7, 'PullRequestEvent', { action: 'closed', pull_request: { number: 2, title: 'Add x', merged: true } }, '2025-01-01T00:00:07Z'),
    event(6, 'PushEvent', { ref: 'refs/heads/dev', size: 2, commits: [{ message: 'one' }, { message: 'two' }] }, '2025-01-01T00:00:06Z'),
    event(5, 'PushEvent', { ref: 'refs/heads/main', size: 1 }),
  ]
  await nextPoll()

  expect(changes.map(change => change.summary)).toEqual(['ann pushed 2 commits to dev', 'ann merged PR #2: Add x', 'ann opened issue #3: Broken'])
  expect(changes.map(change => change.at)).toEqual([Date.parse('2025-01-01T00:00:06Z'), Date.parse('2025-01-01T00:00:07Z'), Date.parse('2025-01-01T00:00:08Z')])
  expect(changes.every(change => change.from === 'o/r')).toBe(true)
  expect(changes[0]?.detail).toContain('- one')

  await nextPoll()
  expect(changes).toHaveLength(3)
})

test('the events filter keeps only the named types', async () => {
  const { repo, github } = fakeRepo()
  repo.events = [event(1, 'PushEvent', { ref: 'refs/heads/main', size: 1 })]
  repo.runs = []
  const { changes, nextPoll } = watching(github, repo, undefined, { events: ['IssuesEvent'] })
  await nextPoll()

  repo.events = [
    event(3, 'IssuesEvent', { action: 'opened', issue: { number: 9, title: 'Bug' } }),
    event(2, 'PushEvent', { ref: 'refs/heads/main', size: 1 }),
    event(1, 'PushEvent', { ref: 'refs/heads/main', size: 1 }),
  ]
  repo.runs = [run(4, 1)]
  await nextPoll()

  expect(changes.map(change => change.summary)).toEqual(['ann opened issue #9: Bug'])
})

test('a failed run is reported once and a failing re-run attempt is reported again', async () => {
  const { repo, github } = fakeRepo()
  const { changes, nextPoll } = watching(github, repo)
  await nextPoll()

  repo.runs = [run(10, 1), run(11, 1, 'success')]
  await nextPoll()
  await nextPoll()
  expect(changes).toHaveLength(1)
  expect(changes[0]).toMatchObject({ from: 'o/r', summary: 'CI failure on main: fix it', at: Date.parse('2025-01-02T00:00:01Z') })
  expect(changes[0]?.detail).toContain('https://github.com/o/r/actions/runs/10')

  repo.runs = [run(10, 2), run(11, 1, 'success')]
  await nextPoll()
  expect(changes).toHaveLength(2)
  expect(changes[1]?.detail).toContain('attempt 2')

  await nextPoll()
  expect(changes).toHaveLength(2)
})

test('failed runs are not reported when the events filter leaves out WorkflowRunEvent', async () => {
  const { repo, github } = fakeRepo()
  const { changes, nextPoll } = watching(github, repo, undefined, { events: ['PushEvent'] })
  await nextPoll()
  repo.runs = [run(1, 1)]
  await nextPoll()
  expect(changes).toEqual([])
})

test('state saved by one watch lets a restarted watch continue without re-emitting', async () => {
  const { repo, github } = fakeRepo()
  repo.events = [event(5, 'PushEvent', { ref: 'refs/heads/main', size: 1 })]
  repo.runs = [run(1, 1)]
  const first = watching(github, repo)
  await first.nextPoll()
  repo.events = [event(6, 'WatchEvent', {}), ...repo.events]
  await first.nextPoll()
  expect(first.changes.map(change => change.summary)).toEqual(['ann starred it'])
  first.started?.stop?.()
  await Bun.sleep(30)

  const second = watching(github, repo, structuredClone(first.context.state))
  await second.nextPoll()
  await second.nextPoll()
  expect(second.changes).toEqual([])

  repo.events = [event(7, 'PublicEvent', {}), ...repo.events]
  await second.nextPoll()
  expect(second.changes.map(change => change.summary)).toEqual(['ann made it public'])
})
