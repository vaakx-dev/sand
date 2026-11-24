import { expect, test } from 'bun:test'
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { claudeHistory } from '../src/session/history'

const line = (id: string, at: string, output: number, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 'session-1',
    requestId: `req-${id}`,
    timestamp: at,
    cwd: '/work/demo',
    message: {
      id,
      model: 'claude-opus-5-5',
      usage: { input_tokens: 10, output_tokens: output, cache_read_input_tokens: 100, cache_creation_input_tokens: 40, cache_creation: { ephemeral_1h_input_tokens: 25 } },
    },
    ...extra,
  }) + '\n'

test('history counts each message once, skips synthetic turns, and picks up appended lines on the next call', async () => {
  const config = mkdtempSync(join(tmpdir(), 'claude-history-'))
  const project = join(config, 'projects', 'demo')
  mkdirSync(join(project, 'subagents'), { recursive: true })
  const main = join(project, 'session-1.jsonl')
  const synthetic = JSON.stringify({ type: 'assistant', timestamp: '2026-03-01T10:00:00Z', message: { id: 'm-synthetic', model: '<synthetic>', usage: { input_tokens: 0, output_tokens: 0 } } })
  writeFileSync(main, line('m1', '2026-03-01T10:00:00Z', 5) + line('m1', '2026-03-01T10:00:00Z', 50) + synthetic + '\n' + line('m0', '2026-02-01T10:00:00Z', 7))
  writeFileSync(join(project, 'subagents', 'agent-1.jsonl'), line('m2', '2026-03-01T11:00:00Z', 9))

  const since = Date.parse('2026-03-01T00:00:00Z')
  const readHistory = claudeHistory(config)
  const first = await readHistory(since)
  expect(first.map(turn => turn.at).sort()).toEqual([Date.parse('2026-03-01T10:00:00Z'), Date.parse('2026-03-01T11:00:00Z')])
  expect(first.find(turn => turn.usage.output === 50)).toEqual({
    session: 'session-1',
    at: Date.parse('2026-03-01T10:00:00Z'),
    model: 'claude-opus-5-5',
    cwd: '/work/demo',
    usage: { input: 10, output: 50, cacheRead: 100, cacheWrite: 40, cacheWriteLong: 25 },
  })

  appendFileSync(main, line('m3', '2026-03-01T12:00:00Z', 3))
  const second = await readHistory(since)
  expect(second).toHaveLength(3)

  appendFileSync(main, line('m4', '2026-03-01T13:00:00Z', 3).slice(0, 40))
  expect(await readHistory(since)).toHaveLength(3)
  rmSync(config, { recursive: true })
})
