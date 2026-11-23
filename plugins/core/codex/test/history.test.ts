import { afterEach, beforeEach, expect, test } from 'bun:test'
import { appendFile, mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rolloutHistory } from '../src/session/history'

let home: string

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'codex-history-'))
  await mkdir(join(home, 'sessions', '2026', '05', '01'), { recursive: true })
  await mkdir(join(home, 'archived_sessions'))
})

afterEach(() => rm(home, { recursive: true, force: true }))

const line = (timestamp: string, type: string, payload: object) => JSON.stringify({ timestamp, type, payload }) + '\n'
const meta = (id: string) => line('2026-05-01T10:00:00.000Z', 'session_meta', { id, cwd: '/work/app' })
const context = (model: string) => line('2026-05-01T10:00:01.000Z', 'turn_context', { model })
const count = (timestamp: string, last: object, totalTokens: number) =>
  line(timestamp, 'event_msg', { type: 'token_count', info: { total_token_usage: { total_tokens: totalTokens }, last_token_usage: last } })
const usage = (input: number, cached: number, output: number) => ({ input_tokens: input, cached_input_tokens: cached, output_tokens: output, reasoning_output_tokens: 3, total_tokens: input + output })

const day = (iso: string) => Date.parse(iso)

test('reads turns from live and archived rollouts, growing files only reparse the appended part', async () => {
  const live = join(home, 'sessions', '2026', '05', '01', 'rollout-2026-05-01T10-00-00-aaa.jsonl')
  await writeFile(
    live,
    meta('aaa') +
      context('gpt-test') +
      line('2026-05-01T10:00:02.000Z', 'event_msg', { type: 'token_count', info: null }) +
      count('2026-05-01T10:00:03.000Z', usage(1000, 400, 50), 1050) +
      count('2026-05-01T10:00:03.500Z', usage(1000, 400, 50), 1050) +
      count('2026-05-01T10:00:04.000Z', usage(1200, 1000, 20), 2270),
  )
  await writeFile(join(home, 'archived_sessions', 'rollout-2026-04-01T10-00-00-bbb.jsonl'), meta('bbb') + context('gpt-old') + count('2026-04-01T10:00:03.000Z', usage(10, 0, 5), 15))

  const history = rolloutHistory(home)
  const first = await history(0)
  expect(first.map(({ session, model, usage }) => ({ session, model, usage })).sort((a, b) => a.session.localeCompare(b.session))).toEqual([
    { session: 'aaa', model: 'gpt-test', usage: { input: 600, output: 50, cacheRead: 400, cacheWrite: 0 } },
    { session: 'aaa', model: 'gpt-test', usage: { input: 200, output: 20, cacheRead: 1000, cacheWrite: 0 } },
    { session: 'bbb', model: 'gpt-old', usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0 } },
  ])
  expect(first.find(turn => turn.session === 'aaa')?.cwd).toBe('/work/app')
  expect(first.find(turn => turn.session === 'aaa')?.at).toBe(day('2026-05-01T10:00:03.000Z'))

  await appendFile(live, context('gpt-next') + count('2026-05-01T11:00:00.000Z', usage(5, 0, 5), 2280) + '{"partial":')
  const grown = await history(day('2026-05-01T00:00:00.000Z'))
  expect(grown.map(({ model }) => model)).toEqual(['gpt-test', 'gpt-test', 'gpt-next'])

  await appendFile(live, '1}\n')
  expect(await history(day('2026-05-01T10:30:00.000Z'))).toHaveLength(1)
})

test('skips files not modified since the cutoff and shares one scan between concurrent calls', async () => {
  const stale = join(home, 'sessions', '2026', '05', '01', 'rollout-2026-05-01T10-00-00-ccc.jsonl')
  await writeFile(stale, meta('ccc') + context('gpt-test') + count('2026-05-01T10:00:03.000Z', usage(10, 0, 5), 15))
  await utimes(stale, new Date('2026-05-01T10:00:04.000Z'), new Date('2026-05-01T10:00:04.000Z'))

  const history = rolloutHistory(home)
  const [recent, again, all] = await Promise.all([history(day('2026-06-01T00:00:00.000Z')), history(day('2026-06-01T00:00:00.000Z')), history(0)])
  expect(recent).toEqual([])
  expect(again).toEqual([])
  expect(all).toHaveLength(1)
})
