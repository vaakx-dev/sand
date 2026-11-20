import type { ToolContext } from '@sand/tools/contract'
import { expect, test } from 'bun:test'
import { restError } from '../src/api/errors'
import { checksTool, type ChecksGit } from '../src/checks/tool'
import type { Logs } from '../src/checks/why'

const sha = 'abc1234def5678'

const git: ChecksGit = {
  remoteUrl: async () => 'git@github.com:acme/tiles.git',
  maybe: async () => sha,
}

const run = (name: string, status: string, conclusion: string | null = null) => ({
  id: 0,
  app: null as { slug: string } | null,
  name,
  status,
  conclusion,
  html_url: `https://github.com/acme/tiles/runs/${name}`,
  details_url: null,
})

const actionsRun = (name: string, id: number, conclusion: string) => ({ ...run(name, 'completed', conclusion), id, app: { slug: 'github-actions' } })

const status = (context: string, state: string) => ({ context, state, target_url: `https://ci.example.com/${context}` })

type Poll = { runs: ReturnType<typeof run>[]; statuses: ReturnType<typeof status>[] } | Error

interface Job {
  steps: { name: string; conclusion: string }[]
  log: string
}

const github = (first: Poll, ...later: Poll[]) => {
  const paths: string[] = []
  const jobs = new Map<string, Job>()
  let poll = first
  let at = 0
  const client: Logs = {
    rest: async <T>(_method: string, path: string) => {
      paths.push(path)
      if (path.endsWith('/pulls/7')) return { head: { sha } } as T
      const job = jobs.get(path)
      if (job) return { steps: job.steps } as T
      const answer = poll
      if (path.includes('/check-runs')) {
        if (answer instanceof Error) throw answer
        return { check_runs: answer.runs } as T
      }
      poll = later[at++] ?? poll
      if (answer instanceof Error) throw answer
      return { statuses: answer.statuses } as T
    },
    text: async path => {
      const job = jobs.get(path.replace(/\/logs$/, ''))
      if (!job) throw restError(404, undefined)
      return job.log
    },
  }
  const failedJob = (id: number, step: string, log: string[]) =>
    jobs.set(`/repos/acme/tiles/actions/jobs/${id}`, {
      steps: [
        { name: 'Set up job', conclusion: 'success' },
        { name: step, conclusion: 'failure' },
      ],
      log: log.map((line, index) => `2026-01-02T03:04:${String(index).padStart(2, '0')}.0000000Z ${line}`).join('\n'),
    })
  return { client, paths, polls: () => at, failedJob }
}

const waitFor = async (client: Logs, input: { pr?: number | string }, folder: ChecksGit = git) => {
  const progress: string[] = []
  const settled: string[] = []
  const tool = checksTool({
    git: folder,
    client,
    listen: () => ({ signal: new AbortController().signal, stop() {} }),
    timing: { intervalMs: 1, graceMs: 200 },
    settled: (conversation, commit, outcome) => settled.push(`${conversation} ${commit} ${outcome}`),
  })
  const context: ToolContext = {
    cwd: '/work/tiles',
    signal: new AbortController().signal,
    conversation: { id: 't1', owner: 'thread', cwd: '/work/tiles', append() {
        throw new Error('checks do not write')
      }, path: () => [], entries: () => [] },
    call: { type: 'tool_call', id: 'c1', name: 'pr_checks', input },
    turn: 'turn1',
    progress: text => progress.push(text),
    wait: () => () => {},
  }
  const result = await tool.run(input, context)
  return { result, progress, settled }
}

test('returns the failed check with its link as soon as one fails, while others still run', async () => {
  const { client, paths } = github(
    { runs: [run('check', 'in_progress'), run('browser', 'queued')], statuses: [status('deploy', 'pending')] },
    { runs: [run('check', 'completed', 'failure'), run('browser', 'in_progress')], statuses: [status('deploy', 'success')] },
  )

  const { result, progress, settled } = await waitFor(client, { pr: 7 })

  expect(paths[0]).toBe('/repos/acme/tiles/pulls/7')
  expect(paths).toContain(`/repos/acme/tiles/commits/${sha}/check-runs?per_page=100`)
  expect(progress).toEqual(['0 of 3 done, running: check, browser, deploy'])
  expect(result).toBe(`Checks on abc1234: 1 failed (2 of 3 done, running: browser):\n- check: https://github.com/acme/tiles/runs/check`)
  expect(settled).toEqual([`t1 ${sha} failed`])
})

test('a failed job reports its failing tests with their errors, leaving out passing tests, test output, source lines and repeats', async () => {
  const { client, failedJob } = github({ runs: [actionsRun('check', 41, 'failure'), run('lint', 'completed', 'success')], statuses: [] })
  failedJob(41, 'Run bun run check', [
    '##[group]Run bun run check',
    'bun run check',
    'shell: /usr/bin/bash -e {0}',
    '##[endgroup]',
    '##[group]src/tiles.test.ts:',
    '\u001b[32m(pass)\u001b[0m lays out a row [0.20ms]',
    'measuring 3 tiles',
    '12 |   const row = layout(tiles)',
    '13 |   expect(row.width).toBe(40)',
    '                          ^',
    'error: expect(received).toBe(expected)',
    '',
    'Expected: 40',
    'Received: 38',
    '',
    '      at <anonymous> (/home/runner/work/tiles/tiles/src/tiles.test.ts:13:21)',
    '      at async <anonymous> (/home/runner/work/tiles/tiles/src/run.ts:4:3)',
    '##[error]Expected: 40\nReceived: 38\n\n      at <anonymous> (/home/runner/work/tiles/tiles/src/tiles.test.ts:13:21)',
    '\u001b[31m(fail)\u001b[0m a row keeps its gaps [1.52ms]',
    '(pass) wraps a long row [0.31ms]',
    '##[endgroup]',
    '1 tests failed:',
    '(fail) a row keeps its gaps [1.52ms]',
    ' 2 pass',
    ' 1 fail',
    'error: script "check" exited with code 1',
    '##[error]Process completed with exit code 1.',
  ])

  const { result } = await waitFor(client, { pr: 7 })

  expect(result).toBe(
    [
      'Checks on abc1234: 1 failed (2 of 2 done):',
      '- check: https://github.com/acme/tiles/runs/check',
      '  Run bun run check: 1 test failed',
      '  ✗ a row keeps its gaps',
      '    error: expect(received).toBe(expected)',
      '    Expected: 40',
      '    Received: 38',
      '    at src/tiles.test.ts:13:21',
    ].join('\n'),
  )
})

test('a job that fails outside its tests reports the failed step and its last lines', async () => {
  const { client, failedJob } = github({ runs: [actionsRun('check', 42, 'failure')], statuses: [] })
  failedJob(42, 'Install', [
    '##[group]Run actions/checkout@v4',
    '##[endgroup]',
    'Checked out abc1234',
    '##[group]Run bun install --frozen-lockfile',
    'bun install --frozen-lockfile',
    '##[endgroup]',
    'Resolving dependencies',
    'error: lockfile had changes, but lockfile is frozen',
    '##[error]Process completed with exit code 1.',
    'Post job cleanup.',
  ])

  const { result } = await waitFor(client, { pr: 7 })

  expect(result).toBe(
    [
      'Checks on abc1234: 1 failed (1 of 1 done):',
      '- check: https://github.com/acme/tiles/runs/check',
      '  Install failed:',
      '    Resolving dependencies',
      '    error: lockfile had changes, but lockfile is frozen',
      '    Process completed with exit code 1.',
    ].join('\n'),
  )
})

const notARepo: ChecksGit = { remoteUrl: async () => undefined, maybe: async () => undefined }

test.each(['acme/tiles#7', 'https://github.com/acme/tiles/pull/7', 'https://github.com/acme/tiles/pull/7/checks?check_run_id=1'])(
  'waits on %s from a folder outside any repo',
  async reference => {
    const { client, paths } = github({ runs: [run('check', 'completed', 'success')], statuses: [] })

    const { result } = await waitFor(client, { pr: reference }, notARepo)

    expect(paths[0]).toBe('/repos/acme/tiles/pulls/7')
    expect(result).toBe('Checks on abc1234: all 1 passed: check.')
  },
)

test('asks for a URL or owner/name#number when a bare number has no repo to belong to', async () => {
  const { client } = github({ runs: [], statuses: [] })

  await expect(waitFor(client, { pr: 7 }, notARepo)).rejects.toThrow("This folder isn't in a GitHub repo; pass the pull request as a URL or owner/name#number.")
})

test('rejects text that is not a pull request', async () => {
  const { client } = github({ runs: [], statuses: [] })

  await expect(waitFor(client, { pr: 'tiles' }, notARepo)).rejects.toThrow('pass a GitHub pull request URL or owner/name#number')
})

test('keeps waiting while no checks are reported right after a push, then reports them passed', async () => {
  const empty = { runs: [], statuses: [] }
  const { client, polls } = github(
    empty,
    empty,
    { runs: [run('check', 'queued')], statuses: [] },
    { runs: [run('check', 'completed', 'success'), run('lint', 'completed', 'skipped')], statuses: [status('deploy', 'success')] },
  )

  const { result, settled } = await waitFor(client, {})

  expect(polls()).toBe(4)
  expect(result).toBe('Checks on abc1234: all 3 passed: check, lint, deploy.')
  expect(settled).toEqual([`t1 ${sha} passed`])
})

test('stops waiting when no checks ever show up', async () => {
  const { client } = github({ runs: [], statuses: [] })

  const { result, settled } = await waitFor(client, {})

  expect(result).toStartWith('Checks on abc1234: no checks reported within')
  expect(settled).toEqual([])
})

test('rides out GitHub failing a few polls in a row, then reports the checks', async () => {
  const outage = restError(502, undefined)
  const { client, polls } = github(
    { runs: [run('check', 'in_progress')], statuses: [] },
    outage,
    outage,
    outage,
    outage,
    outage,
    { runs: [run('check', 'completed', 'success')], statuses: [] },
  )

  const { result, progress } = await waitFor(client, {})

  expect(polls()).toBe(7)
  expect(progress).toContain('0 of 1 done, running: check; retrying after: GitHub is having trouble (HTTP 502); try again later.')
  expect(result).toBe('Checks on abc1234: all 1 passed: check.')
})

test('gives up saying what failed when GitHub keeps failing', async () => {
  const { client } = github({ runs: [run('check', 'in_progress')], statuses: [] }, restError(502, undefined))

  await expect(waitFor(client, {})).rejects.toThrow('GitHub is having trouble (HTTP 502); try again later. Last seen: 0 of 1 done, running: check.')
})
