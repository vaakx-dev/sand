import { type Session, textOf } from '@sand/chats/contract'
import { devServerList } from '@sand/dev-servers/contract'
import { type Sand, startHost, startSand, type TestHost } from '@sand/harness'
import { runtimeDrain } from '@sand/host-runtimes/contract'
import { backgroundJobs, jobEnd } from '@sand/jobs/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PLUGINS = ['core/watch', 'agent/jobs', 'agent/shell', 'agent/shell-jobs', 'agent/processes', 'agent/dev-servers']
const WAIT_MS = 20_000

const server = `
Bun.serve({ port: Number(process.argv[2]), fetch: () => new Response('<!doctype html><title>Tide tables</title>', { headers: { 'content-type': 'text/html' } }) })
`

const launcher = `
const child = Bun.spawn([process.execPath, ...process.argv.slice(2)], { stdio: ['ignore', 'inherit', 'inherit'] })
process.exit(await child.exited)
`

let home: string
let host: TestHost
let running: Sand[]

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-reload-'))
  host = await startHost(home, ['agent/command-keeper'])
  running = []
})

afterEach(async () => {
  for (const sand of running) await sand.stop()
  await host.stop()
  rmSync(home, { recursive: true, force: true })
})

const start = async () => {
  const sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { home, host, plugins: PLUGINS, options: { 'dev-servers': { every_ms: 100 } } })
  running.push(sand)
  return sand
}

const stopRuntime = async (sand: Sand) => {
  sand.app.emit(runtimeDrain)
  running = running.filter(other => other !== sand)
  await sand.stop()
}

const use = async (sand: Sand, session: Session, name: string, input: Record<string, unknown>) => {
  const call = { type: 'tool_call', id: `${name}-${Bun.randomUUIDv7()}`, name, input } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress: () => {}, wait: () => () => {} })
  return textOf(result.content)
}

const background = async (sand: Sand, session: Session, command: string) => /^Started (\S+)\./.exec(await use(sand, session, 'run_background', { command }))?.[1] ?? ''

const until = async (met: () => boolean | Promise<boolean>) => {
  const deadline = Date.now() + WAIT_MS
  while (!(await met()) && Date.now() < deadline) await Bun.sleep(100)
  return met()
}

const answers = (port: number) =>
  fetch(`http://localhost:${port}/`).then(
    () => true,
    () => false,
  )

const freePort = () => {
  const probe = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } })
  const { port } = probe
  probe.stop(true)
  return port
}

const unixPath = (path: string) => path.replaceAll('\\', '/')

const notified = (sand: Sand, session: Session, job: string) => JSON.stringify(sand.sessions.require(session.id).messages()).includes(job)

test('background commands outlive a plugin reload: the fresh runtime lists, reads and stops them, and their exits still reach the thread', async () => {
  const old = await start()
  const thread = old.chat('fake/m')
  const [serverScript, launcherScript, built] = ['server.ts', 'launcher.ts', 'built'].map(name => unixPath(join(home, name)))
  await Promise.all([Bun.write(serverScript!, server), Bun.write(launcherScript!, launcher)])
  const port = freePort()
  const site = await background(old, thread, `"${unixPath(process.execPath)}" "${launcherScript}" "${serverScript}" ${port}`)
  const build = await background(old, thread, `echo compiling; while [ ! -f "${built}" ]; do sleep 0.1; done; echo linked`)
  await use(old, thread, 'job_wait', { jobs: [build], until: 'compiling' })
  expect(await until(() => answers(port))).toBe(true)

  const fresh = await start()
  await stopRuntime(old)
  const carried = fresh.sessions.require(thread.id)

  expect(await answers(port)).toBe(true)
  expect(fresh.app.get(backgroundJobs)!.list(thread.id).map(job => [job.id, job.status])).toEqual([
    [site, 'running'],
    [build, 'running'],
  ])
  expect(await use(fresh, carried, 'job_read', { job: build })).toContain('compiling')
  expect(await until(async () => (await fresh.ask(devServerList, { session: thread.id })).some(listed => listed.port === port))).toBe(true)

  const ended = new Promise<string>(resolve =>
    fresh.app.on(jobEnd, (job, output) => {
      if (job.id === build) resolve(`${job.status}: ${output}`)
    }),
  )
  await Bun.write(built!, '')
  expect(await ended).toStartWith('done: compiling\nlinked\n')
  expect(await until(() => notified(fresh, carried, build))).toBe(true)

  await use(fresh, carried, 'job_stop', { job: site })
  expect(await until(async () => !(await answers(port)))).toBe(true)
})
