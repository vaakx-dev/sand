import type { GitHub } from '@sand/github/contract'
import type { Change, KindContext } from '@sand/watches/contract'
import { expect, test } from 'bun:test'
import { pullKind } from '../src/runtime/kind'

const SHA = 'abc1234def5678'

const fakePull = () => {
  const pull = { state: 'open', merged: false, mergeable: true as boolean | null, reviews: [] as object[], reviewComments: [] as object[], comments: [] as object[], reads: 0 }
  const answers = (path: string): unknown => {
    if (path.endsWith('/pulls/7')) {
      pull.reads++
      return { title: 'Retry uploads', state: pull.state, merged: pull.merged, mergeable: pull.mergeable, html_url: 'https://github.com/acme/tiles/pull/7', head: { sha: SHA }, base: { ref: 'main' } }
    }
    if (path.includes('/check-runs')) return { check_runs: [] }
    if (path.includes('/status')) return { statuses: [] }
    if (path.includes('/reviews')) return pull.reviews
    if (path.includes('/pulls/7/comments')) return pull.reviewComments
    return pull.comments
  }
  const github: GitHub = { rest: async <T>(_method: string, path: string) => answers(path) as T, async *changes() {} }
  return { pull, github }
}

const watching = (github: GitHub) => {
  const changes: Change[] = []
  const controller = new AbortController()
  let state: unknown
  const context: KindContext = {
    id: 'w1',
    get state() {
      return state
    },
    save: next => void (state = next),
    emit: change => void changes.push(change),
    fail: error => {
      throw error
    },
    signal: controller.signal,
  }
  void pullKind(github, { pollMs: 10, settleMs: 5 }).start({ repo: 'acme/tiles', number: 7 }, context)
  return { changes, stop: () => controller.abort() }
}

const until = async (done: () => boolean) => {
  for (let tries = 0; tries < 300 && !done(); tries++) await Bun.sleep(5)
  expect(done()).toBe(true)
}

test("a followed pull request reports each change once: a review with its comments, a conflict once GitHub knows, and nothing after it merges", async () => {
  const { pull, github } = fakePull()
  const { changes, stop } = watching(github)
  await until(() => pull.reads >= 2)
  expect(changes).toEqual([])

  pull.reviews = [{ id: 10, user: { login: 'mira' }, state: 'CHANGES_REQUESTED', body: 'A few things.', html_url: 'https://github.com/acme/tiles/pull/7#review-10' }]
  pull.reviewComments = [
    { id: 20, pull_request_review_id: 10, user: { login: 'mira' }, path: 'src/upload.ts', line: 42, original_line: 42, body: 'Stop on 4xx.', html_url: 'u20' },
    { id: 21, pull_request_review_id: 10, user: { login: 'mira' }, path: 'src/upload.ts', line: null, original_line: 61, body: 'Name it delayMs.', html_url: 'u21' },
  ]
  pull.comments = [{ id: 30, user: { login: 'jon' }, body: 'Looks good once CI is green.', html_url: 'u30' }]
  pull.mergeable = null
  await until(() => changes.length === 2)
  expect(changes.map(change => change.summary)).toEqual(['mira requested changes (2 comments)', 'jon commented'])
  expect(changes[0]?.detail).toContain('src/upload.ts:42\nStop on 4xx.')
  expect(changes[0]?.detail).toContain('src/upload.ts:61\nName it delayMs.')

  pull.mergeable = false
  await until(() => changes.length === 3)
  pull.mergeable = null
  await Bun.sleep(40)
  expect(changes.at(-1)?.summary).toBe('Has merge conflicts with main')

  pull.state = 'closed'
  pull.merged = true
  await until(() => changes.length === 4)
  expect(changes.at(-1)?.summary).toBe('Merged into main')
  const reads = pull.reads
  await Bun.sleep(40)
  expect(pull.reads).toBe(reads)
  expect(changes).toHaveLength(4)
  stop()
})
