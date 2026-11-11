import { type Session, textOf } from '@sand/chats/contract'
import { startSand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Awaited<ReturnType<typeof startSand>>

afterEach(() => sand.stop())

const start = (child: Reply[] = []) =>
  startSand(
    [
      { id: 'parent', models: ['m'], replies: [[{ type: 'call', name: 'agent', input: { label: 'Dig', task: 'Dig into it', model: 'child/m' } }], [{ type: 'text', text: 'Started.' }]], api: 'anthropic' },
      { id: 'child', models: ['m'], replies: child, api: 'anthropic' },
    ],
    { plugins: ['core/watch', 'agent/jobs', 'agent/shell', 'agent/shell-jobs', 'agent/subagents'] },
  )

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
  expect(value).toContain(`${slow} · command · running`)
  expect(seconds).toBeLessThan(10)
  await use(thread, 'job_stop', { job: slow })
})

test("while it waits, progress shows how many jobs are done and each running one's latest activity", async () => {
  let release = () => {}
  const held = new Promise<void>(resolve => (release = resolve))
  sand = await start([[{ type: 'call', name: 'probe', input: { what: 'deep dig' } }], [{ type: 'text', text: 'Found it.' }]])
  sand.tool('probe', () => held.then(() => 'probed'))
  const thread = sand.chat('parent/m')
  await sand.turns.run(thread, 'Go')
  const agent = /job_\w+/.exec(await use(thread, 'jobs', {}))![0]
  const command = await background(thread, 'echo warming up; sleep 4', 'Warm')
  const lines: string[] = []

  const waited = use(thread, 'job_wait', { jobs: [agent, command] }, text => {
    lines.push(...text.split('\n'))
    if (lines.some(line => line.includes('probe deep dig'))) release()
  })

  expect(await waited).toContain('Found it.')
  expect(lines).toContainEqual(expect.stringMatching(/^0\/2 done · Dig · step \d+ · probe deep dig$/))
  expect(lines).toContainEqual(expect.stringMatching(/^[01]\/2 done · Warm · warming up$/))
  expect(lines).toContainEqual(expect.stringMatching(/^1\/2 done · (Dig|Warm) · done$/))
}, 20_000)
