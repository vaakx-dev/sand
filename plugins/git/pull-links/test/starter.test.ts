import { type GitHub, github, pullChanged, type PullRef, type PullSummary } from '@sand/github/contract'
import { startSand, type Sand } from '@sand/harness'
import { type Notice, orchestrator } from '@sand/orchestrator/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { parseLinks } from '../src/book/record'
import { pullLinksService } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

const pull: PullRef = { repo: 'acme/app', number: 12 }

const summaryOf = (change: Partial<PullSummary>): PullSummary => ({
  ...pull,
  title: 'Fix login',
  url: 'https://github.com/acme/app/pull/12',
  state: 'open',
  head: 'abc123',
  base: 'main',
  author: 'bo',
  updated: 1,
  add: 1,
  del: 0,
  files: 1,
  checks: { state: 'pass', passed: 2, failed: 0, pending: 0 },
  checkList: [],
  review: 'none',
  merge: 'clean',
  unresolved: 0,
  ...change,
})

const failing = summaryOf({
  checks: { state: 'fail', passed: 1, failed: 1, pending: 0 },
  checkList: [
    { name: 'lint', state: 'pass' },
    { name: 'build', state: 'fail' },
  ],
})

const offline = (): never => {
  throw new Error('No GitHub in tests')
}

const fakeGitHub = (current: () => PullSummary): GitHub => ({
  auth: offline,
  summary: async () => current(),
  nodeId: offline,
  noteSummary() {},
  forBranch: async () => null,
  resolve: offline,
  remoteFor: offline,
  graphql: offline,
  rest: offline,
  jobLog: offline,
})

const start = async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[{ type: 'text', text: 'On it.' }]] }], { plugins: ['core/watch', 'git/runner', 'git/git'] })
  let current = summaryOf({})
  sand.app.provide(github, fakeGitHub(() => current))
  sand.app.load(join(import.meta.dir, '..', 'src', 'runtime.ts'))
  await sand.app.settled()

  const threads = sand.app.get(orchestrator)!
  const told: Notice[] = []
  const deliver = async (_: string, notice: Notice) => {
    if (notice.text.includes('<kind>pull request</kind>')) told.push(notice)
  }
  threads.owner('bot', { deliver, label: () => 'Release bot' })
  const { thread } = await threads.start({ cwd: sand.home, prompt: 'Ship the fix', model: 'fake/m', origin: 'cli', clientRequestId: 'ship', from: { owner: 'bot', id: 'release' } })
  await sand.app.get(pullLinksService)!.link(thread, pull, 'linked')

  const change = async (summary: PullSummary) => {
    current = summary
    sand.app.emit(pullChanged, summary)
    await Bun.sleep(20)
  }
  const stored = () => parseLinks(sand.sessions.require(thread).latest('pull-links')?.data)?.links[0]?.told
  return { thread, told, change, stored }
}

test("a thread's starter hears once when its pull request's checks fail, again after they recover and fail, and when it merges", async () => {
  const { thread, told, change, stored } = await start()

  await change(summaryOf({}))
  expect(told).toEqual([])

  await change(failing)
  await change(failing)
  expect(told).toHaveLength(1)
  expect(told[0]!.text).toBe(
    [
      '<task-notification>',
      `<thread>${thread}</thread>`,
      '<kind>pull request</kind>',
      '<label>#12 Fix login</label>',
      '<status>checks failed</status>',
      '<result>',
      'acme/app#12 https://github.com/acme/app/pull/12',
      'Failed checks: build',
      '</result>',
      '</task-notification>',
    ].join('\n'),
  )
  expect(told[0]!.clientRequestId).toBe(`${thread}@acme/app#12:failing:abc123`)
  expect(stored()).toBe('failing')

  await change(summaryOf({ head: 'def456' }))
  expect(stored()).toBe('open')
  await change({ ...failing, head: 'def456' })
  await change(summaryOf({ state: 'merged', head: 'def456', ended: 2 }))
  expect(told.map(notice => notice.text.match(/<status>(.*)<\/status>/)![1])).toEqual(['checks failed', 'checks failed', 'merged'])
  expect(told[2]!.text).toContain('<result>\nacme/app#12 https://github.com/acme/app/pull/12\n</result>')
  expect(stored()).toBe('merged')
})

test('a closed pull request is told to the starter, and a thread nobody started hears nothing', async () => {
  const { told, change } = await start()
  const own = sand.chat('fake/m')
  await sand.app.get(pullLinksService)!.link(own.id, pull, 'linked')

  await change(summaryOf({ state: 'closed', ended: 2 }))
  expect(told.map(notice => notice.text.match(/<thread>(.*)<\/thread>/)![1])).not.toContain(own.id)
  expect(told).toHaveLength(1)
  expect(told[0]!.text).toContain('<status>closed</status>')
})
