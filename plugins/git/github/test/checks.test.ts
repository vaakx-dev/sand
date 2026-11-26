import type { ToolContext } from '@sand/tools/contract'
import { expect, test } from 'bun:test'
import { restError } from '../src/api/errors'
import { checksTool } from '../src/checks/tool'
import type { TargetGit } from '../src/checks/target'
import type { Logs } from '../src/checks/why'

const sha = 'abc1234def5678'

const knownRefs = ['main', 'release/1.2', 'v1.2.0', 'abc1234']

const git: TargetGit = {
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
      if (path.includes('/commits?sha=')) {
        if (!knownRefs.some(ref => path.includes(`sha=${encodeURIComponent(ref)}&`))) throw restError(404, undefined)
        return [{ sha }] as T
      }
      if (path.endsWith('/actions/runs/99')) return { name: 'CI', head_sha: sha } as T
      const job = jobs.get(path)
      if (job) return { steps: job.steps } as T
      const answer = poll
      if (path.includes('/check-runs')) {
        if (answer instanceof Error) throw answer
        return { check_runs: answer.runs } as T
      }
      poll = later[at++] ?? poll
      if (answer instanceof Error) throw answer
      if (path.includes('/actions/runs/99/jobs')) return { jobs: answer.runs } as T
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

const waitFor = async (client: Logs, input: { target?: number | string }, folder: TargetGit = git) => {
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

  const { result, progress, settled } = await waitFor(client, { target: 7 })

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

  const { result } = await waitFor(client, { target: 7 })

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

  const { result } = await waitFor(client, { target: 7 })

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

const notARepo: TargetGit = { remoteUrl: async () => undefined, maybe: async () => undefined }

test.each(['acme/tiles#7', 'https://github.com/acme/tiles/pull/7', 'https://github.com/acme/tiles/pull/7/checks?check_run_id=1'])(
  'waits on pull request %s from a folder outside any repo',
  async reference => {
    const { client, paths } = github({ runs: [run('check', 'completed', 'success')], statuses: [] })

    const { result } = await waitFor(client, { target: reference }, notARepo)

    expect(paths[0]).toBe('/repos/acme/tiles/pulls/7')
    expect(result).toBe('Checks on abc1234: all 1 passed: check.')
  },
)

test.each([7, '7', '#7'])('waits on pull request %p in this folder\'s repo', async reference => {
  const { client, paths } = github({ runs: [run('check', 'completed', 'success')], statuses: [] })

  await waitFor(client, { target: reference })

  expect(paths[0]).toBe('/repos/acme/tiles/pulls/7')
})

test.each(['main', 'release/1.2', 'v1.2.0', 'abc1234'])('waits on the commit that branch, tag or SHA %s names in this folder\'s repo', async ref => {
  const { client, paths } = github({ runs: [run('check', 'completed', 'success')], statuses: [status('deploy', 'success')] })

  const { result, settled } = await waitFor(client, { target: ref })

  expect(paths[0]).toBe(`/repos/acme/tiles/commits?sha=${encodeURIComponent(ref)}&per_page=1`)
  expect(result).toBe('Checks on abc1234: all 2 passed: check, deploy.')
  expect(settled).toEqual([`t1 ${sha} passed`])
})

test('says which name GitHub has no branch, tag or commit for', async () => {
  const { client } = github({ runs: [], statuses: [] })

  await expect(waitFor(client, { target: 'tiles' })).rejects.toThrow('GitHub has no branch, tag or commit "tiles" in acme/tiles; push it, or check the name.')
})

test.each([
  ['https://github.com/acme/tiles/actions/runs/99', notARepo],
  ['https://github.com/acme/tiles/actions/runs/99/job/5?pr=7', notARepo],
  ['run:99', git],
] as const)('waits on only the jobs of workflow run %s, without settling the whole commit', async (reference, folder) => {
  const { client, paths } = github(
    { runs: [run('test', 'in_progress')], statuses: [status('deploy', 'pending')] },
    { runs: [run('test', 'completed', 'success'), run('lint', 'completed', 'skipped')], statuses: [status('deploy', 'pending')] },
  )

  const { result, settled } = await waitFor(client, { target: reference }, folder)

  expect(paths.filter(path => path.includes('/status'))).toEqual([])
  expect(result).toBe('CI run 99 on abc1234: all 2 passed: test, lint.')
  expect(settled).toEqual([])
})

test('a failed job in a workflow run reports why it failed', async () => {
  const { client, failedJob } = github({ runs: [actionsRun('test', 43, 'failure')], statuses: [] })
  failedJob(43, 'Install', ['##[group]Run bun install', '##[endgroup]', 'error: lockfile is frozen', '##[error]Process completed with exit code 1.'])

  const { result } = await waitFor(client, { target: 'run:99' })

  expect(result).toBe(
    ['CI run 99 on abc1234: 1 failed (1 of 1 done):', '- test: https://github.com/acme/tiles/runs/test', '  Install failed:', '    error: lockfile is frozen', '    Process completed with exit code 1.'].join('\n'),
  )
})

test('asks for a URL when a target needs this folder\'s repo and it has none', async () => {
  const { client } = github({ runs: [], statuses: [] })

  await expect(waitFor(client, { target: 7 }, notARepo)).rejects.toThrow("This folder isn't in a GitHub repo; pass a pull request or Actions run URL.")
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
