import { type Session, textOf } from '@sand/chats/contract'
import { startSand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Awaited<ReturnType<typeof startSand>>

afterEach(() => sand.stop())

const start = () => startSand([{ id: 'parent', models: ['m'], replies: [], api: 'anthropic' }], { plugins: ['core/watch', 'agent/jobs', 'agent/shell', 'agent/shell-jobs'] })

const use = async (session: Session, name: string, input: Record<string, unknown>, progress: (text: string) => void = () => {}) => {
  const call = { type: 'tool_call', id: `${name}-${Bun.randomUUIDv7()}`, name, input } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress, wait: () => () => {} })
  return textOf(result.content)
}

const background = async (session: Session, command: string, label: string) => {
  const [, job] = /^Started (\S+)\./.exec(await use(session, 'run_background', { command, label })) ?? []
  return job!
}

const timed = async <T>(run: () => Promise<T>) => {
  const started = performance.now()
  const value = await run()
  return { value, seconds: (performance.now() - started) / 1000 }
}

test('until returns as soon as a background command prints a line that matches, while it keeps running', async () => {
  sand = await start()
  const thread = sand.chat('parent/m')
  const job = await background(thread, 'echo booting; sleep 2; echo "Server ready on :3000"; sleep 60', 'Server')

  const { value, seconds } = await timed(() => use(thread, 'job_wait', { jobs: [job], until: 'listening on|ready' }))

  expect(value).toStartWith(`${job} output matched; it keeps running.`)
  expect(value).toContain('Server ready on :3000')
  expect(seconds).toBeGreaterThan(1.5)
  expect(seconds).toBeLessThan(5)
  expect(await use(thread, 'job_wait', { jobs: [job], until: 'ready' })).toStartWith(`${job} output matched`)
  await use(thread, 'job_stop', { job })
})

test('any returns the first finished job and leaves the rest running', async () => {
  sand = await start()
  const thread = sand.chat('parent/m')
  const quick = await background(thread, 'sleep 1; echo first report', 'Quick')
  const slow = await background(thread, 'sleep 60', 'Slow')

  const { value, seconds } = await timed(() => use(thread, 'job_wait', { jobs: [quick, slow], any: true }))

  expect(value).toStartWith(`${quick} finished; the others keep running.`)
  expect(value).toContain('first report')
  expect(value).toContain(`${slow} · running`)
  expect(seconds).toBeLessThan(10)
  await use(thread, 'job_stop', { job: slow })
})

test("while it waits, progress shows how many jobs are done and each running one's latest output", async () => {
  sand = await start()
  const thread = sand.chat('parent/m')
  const quick = await background(thread, 'echo warming up; sleep 1', 'Warm')
  const slow = await background(thread, 'echo still going; sleep 3', 'Slow')
  const lines: string[] = []

  await use(thread, 'job_wait', { jobs: [quick, slow] }, text => lines.push(...text.split('\n')))

  expect(lines).toContainEqual(expect.stringMatching(/^0\/2 done · Warm · (warming up|running)$/))
  expect(lines).toContainEqual(expect.stringMatching(/^1\/2 done · Warm · done$/))
})
