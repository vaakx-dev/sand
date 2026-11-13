import { type Session, textOf } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { backgroundJobs } from '@sand/jobs/contract'
import { threadStop } from '@sand/orchestrator/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

const EXIT_WAIT_MS = 5_000

let sand: Sand

afterEach(() => sand.stop())

const parentWithChild = `bun -e "const child = Bun.spawn([process.execPath, '-e', 'setInterval(() => {}, 1000)']); console.log('child ' + child.pid); setInterval(() => {}, 1000)"`

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const exited = async (pid: number) => {
  const deadline = Date.now() + EXIT_WAIT_MS
  while (alive(pid) && Date.now() < deadline) await Bun.sleep(50)
  return !alive(pid)
}

const use = async (session: Session, name: string, input: Record<string, unknown>) => {
  const call = { type: 'tool_call', id: `${name}-${Bun.randomUUIDv7()}`, name, input } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress: () => {}, wait: () => () => {} })
  return textOf(result.content)
}

const startChild = async (session: Session) => {
  const [, job] = /^Started (\S+)\./.exec(await use(session, 'run_background', { command: parentWithChild })) ?? []
  const waited = await use(session, 'job_wait', { jobs: [job], until: 'child \\d+' })
  const [, pid] = /child (\d+)/.exec(waited) ?? []
  return Number(pid)
}

test('stopping a thread with no turn kills the whole process tree of its background commands', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins: ['agent/jobs', 'agent/shell', 'agent/shell-jobs'] })
  const thread = sand.chat('fake/m')
  const child = await startChild(thread)
  expect(alive(child)).toBe(true)

  expect(await sand.ask(threadStop, { session: thread.id })).toBe(true)

  expect(await exited(child)).toBe(true)
  expect(sand.app.get(backgroundJobs)!.list(thread.id).map(job => job.status)).toEqual(['cancelled'])
  expect(await sand.ask(threadStop, { session: thread.id })).toBe(false)
})
