import type { ToolContext } from '@sand/tools/contract'
import { expect, test } from 'bun:test'
import type { Client } from '../src/api/client'
import { restError } from '../src/api/errors'
import { checksTool, type ChecksGit } from '../src/checks/tool'

const sha = 'abc1234def5678'

const git: ChecksGit = {
  remoteUrl: async () => 'git@github.com:acme/tiles.git',
  maybe: async () => sha,
}

const run = (name: string, status: string, conclusion: string | null = null) => ({
  name,
  status,
  conclusion,
  html_url: `https://github.com/acme/tiles/runs/${name}`,
  details_url: null,
})

const status = (context: string, state: string) => ({ context, state, target_url: `https://ci.example.com/${context}` })

type Poll = { runs: ReturnType<typeof run>[]; statuses: ReturnType<typeof status>[] } | Error

const github = (first: Poll, ...later: Poll[]) => {
  const paths: string[] = []
  let poll = first
  let at = 0
  const client: Client = {
    rest: async <T>(_method: string, path: string) => {
      paths.push(path)
      if (path.endsWith('/pulls/7')) return { head: { sha } } as T
      const answer = poll
      if (path.includes('/check-runs')) {
        if (answer instanceof Error) throw answer
        return { check_runs: answer.runs } as T
      }
      poll = later[at++] ?? poll
      if (answer instanceof Error) throw answer
      return { statuses: answer.statuses } as T
    },
  }
  return { client, paths, polls: () => at }
}

const waitFor = async (client: Client, input: { pr?: number }) => {
  const progress: string[] = []
  const tool = checksTool({
    git,
    client,
    listen: () => ({ signal: new AbortController().signal, stop() {} }),
    timing: { intervalMs: 1, graceMs: 200 },
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
  return { result, progress }
}

test('returns the failed check with its link as soon as one fails, while others still run', async () => {
  const { client, paths } = github(
    { runs: [run('check', 'in_progress'), run('browser', 'queued')], statuses: [status('deploy', 'pending')] },
    { runs: [run('check', 'completed', 'failure'), run('browser', 'in_progress')], statuses: [status('deploy', 'success')] },
  )

  const { result, progress } = await waitFor(client, { pr: 7 })

  expect(paths[0]).toBe('/repos/acme/tiles/pulls/7')
  expect(paths).toContain(`/repos/acme/tiles/commits/${sha}/check-runs?per_page=100`)
  expect(progress).toEqual(['0 of 3 done, running: check, browser, deploy'])
  expect(result).toBe(`Checks on abc1234: 1 failed (2 of 3 done, running: browser):\n- check: https://github.com/acme/tiles/runs/check`)
})

test('keeps waiting while no checks are reported right after a push, then reports them passed', async () => {
  const empty = { runs: [], statuses: [] }
  const { client, polls } = github(
    empty,
    empty,
    { runs: [run('check', 'queued')], statuses: [] },
    { runs: [run('check', 'completed', 'success'), run('lint', 'completed', 'skipped')], statuses: [status('deploy', 'success')] },
  )

  const { result } = await waitFor(client, {})

  expect(polls()).toBe(4)
  expect(result).toBe('Checks on abc1234: all 3 passed: check, lint, deploy.')
})

test('stops waiting when no checks ever show up', async () => {
  const { client } = github({ runs: [], statuses: [] })

  const { result } = await waitFor(client, {})

  expect(result).toStartWith('Checks on abc1234: no checks reported within')
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
