import { type Session, textOf } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { performanceRead } from '../src/contract'

const HELD_MB = 300
const MB = 1024 * 1024
const HELD_WAIT_MS = 10_000

let sand: Sand

afterEach(() => sand.stop())

const holder = `bun -e "const kept = Buffer.alloc(${HELD_MB} * 1024 * 1024, 1); console.log('holding'); setInterval(() => kept[0]++, 1000)"`

const use = async (session: Session, name: string, input: Record<string, unknown>) => {
  const call = { type: 'tool_call', id: `${name}-${Bun.randomUUIDv7()}`, name, input } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress: () => {}, wait: () => () => {} })
  return textOf(result.content)
}

test("Performance names the chat a command belongs to and counts the command's memory toward it", async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins: ['agent/jobs', 'agent/shell', 'agent/shell-jobs', 'agent/processes', 'ui/shared/performance'] })
  const chat = sand.chat('fake/m')
  const [, job] = /^Started (\S+)\./.exec(await use(chat, 'run_background', { command: holder })) ?? []
  await use(chat, 'job_wait', { jobs: [job], until: 'holding', timeout_ms: HELD_WAIT_MS })

  const report = await sand.ask(performanceRead, { range: '5m' })

  expect(report.chats).toEqual([expect.objectContaining({ conversation: chat.id, title: chat.title, trees: [expect.objectContaining({ label: expect.stringMatching(/^bun -e/), kind: 'command' })] })])
  expect(report.chats[0]!.bytes).toBeGreaterThan(HELD_MB * MB)
  expect(report.totalBytes).toBeGreaterThan(report.freeBytes)
  expect(report.bars).toHaveLength(30)
})
