import { type Session, textOf } from '@sand/chats/contract'
import { type Sand, startHost, startSand, type TestHost } from '@sand/harness'
import { hostRestart } from '@sand/host-daemon/contract'
import { runtimeDrain } from '@sand/host-runtimes/contract'
import { backgroundJobs, jobEnd } from '@sand/jobs/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { placeOf } from '../src/wire'

const PLUGINS = ['core/watch', 'agent/jobs', 'agent/shell', 'agent/shell-jobs', 'agent/processes']
const WAIT_MS = 20_000

const server = `
Bun.serve({ port: Number(process.argv[2]), fetch: () => new Response('tide tables') })
`

let home: string
let hosts: TestHost[]
let running: Sand[]

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'sand-keeper-'))
  hosts = []
  running = []
})

afterEach(async () => {
  for (const sand of running) await sand.stop()
  for (const host of hosts) await host.stop()
  rmSync(home, { recursive: true, force: true })
})

const start = async () => {
  const host = await startHost(home, ['agent/command-keeper'])
  hosts.push(host)
  const sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { home, host, plugins: PLUGINS })
  running.push(sand)
  return { host, sand }
}

const stop = async ({ host, sand }: { host: TestHost; sand: Sand }) => {
  running = running.filter(other => other !== sand)
  hosts = hosts.filter(other => other !== host)
  await sand.stop()
  await host.stop()
}

const restart = async (old: { host: TestHost; sand: Sand }) => {
  old.sand.app.emit(runtimeDrain)
  old.host.app.emit(hostRestart)
  await stop(old)
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

const keeperListens = () =>
  new Promise<boolean>(resolve => {
    const socket = connect(placeOf(home).path, () => {
      socket.end()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
  })

const unixPath = (path: string) => path.replaceAll('\\', '/')

const notified = (sand: Sand, session: Session, job: string) => JSON.stringify(sand.sessions.require(session.id).messages()).includes(job)

const serve = async (sand: Sand, session: Session) => {
  const script = unixPath(join(home, 'server.ts'))
  await Bun.write(script, server)
  const port = freePort()
  const job = await background(sand, session, `"${unixPath(process.execPath)}" "${script}" ${port}`)
  expect(await until(() => answers(port))).toBe(true)
  return { job, port }
}

test('background commands outlive a host restart: the new host lists, reads and stops them, and exits during and after the restart reach the thread', async () => {
  const old = await start()
  const thread = old.sand.chat('fake/m')
  const [built, finished, shipped] = ['built', 'finished', 'shipped'].map(name => unixPath(join(home, name)))
  const site = await serve(old.sand, thread)
  const build = await background(old.sand, thread, `echo compiling; while [ ! -f "${built}" ]; do sleep 0.1; done; echo linked`)
  const ship = await background(old.sand, thread, `while [ ! -f "${finished}" ]; do sleep 0.1; done; echo shipped; touch "${shipped}"`)
  await use(old.sand, thread, 'job_wait', { jobs: [build], until: 'compiling' })

  await restart(old)
  await Bun.write(finished!, '')
  expect(await until(() => existsSync(shipped!))).toBe(true)
  expect(await answers(site.port)).toBe(true)

  const fresh = await start()
  const carried = fresh.sand.sessions.require(thread.id)
  const listed = () => fresh.sand.app.get(backgroundJobs)!.list(thread.id).map(job => [job.id, job.status])
  expect(await until(() => listed().length === 3)).toBe(true)
  expect(listed()).toEqual([
    [site.job, 'running'],
    [build, 'running'],
    [ship, 'done'],
  ])
  expect(await until(() => notified(fresh.sand, carried, ship))).toBe(true)
  expect(notified(fresh.sand, carried, site.job)).toBe(false)
  expect(await use(fresh.sand, carried, 'job_read', { job: build })).toContain('compiling')

  const ended = new Promise<string>(resolve =>
    fresh.sand.app.on(jobEnd, (job, output) => {
      if (job.id === build) resolve(`${job.status}: ${output}`)
    }),
  )
  await Bun.write(built!, '')
  expect(await ended).toStartWith('done: compiling\nlinked\n')
  expect(await until(() => notified(fresh.sand, carried, build))).toBe(true)

  await use(fresh.sand, carried, 'job_stop', { job: site.job })
  expect(await until(async () => !(await answers(site.port)))).toBe(true)
  expect(await until(async () => !(await keeperListens()))).toBe(true)
})

test('stopping sand stops its background commands, and the keeper leaves with them', async () => {
  const sand = await start()
  const site = await serve(sand.sand, sand.sand.chat('fake/m'))
  expect(await keeperListens()).toBe(true)

  await stop(sand)

  expect(await until(async () => !(await answers(site.port)))).toBe(true)
  expect(await until(async () => !(await keeperListens()))).toBe(true)
  expect(await until(() => !existsSync(placeOf(home).tokenFile))).toBe(true)
})
