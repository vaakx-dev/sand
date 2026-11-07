import { createLedger, ledger } from '@sand/ledger/contract'
import { type ShellRunner, shellRunner } from '@sand/shell/contract'
import { type Change, type Kind, type KindContext, type Watches, watches } from '@sand/watches/contract'
import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'
import { createApp, type Context } from 'drydock'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import plugin from '../src/index'

const timings = { debounce_ms: 30, retry_ms: 150 }

let db = new Database(':memory:', { strict: true })
let app: Context | undefined
let dir: string | undefined

afterEach(async () => {
  await app?.dispose()
  app = undefined
  db.close()
  db = new Database(':memory:', { strict: true })
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

const start = async (runner?: ShellRunner) => {
  await app?.dispose()
  app = createApp()
  app.provide(ledger, createLedger(db))
  if (runner) app.provide(shellRunner, runner)
  app.plugin(plugin, timings)
  await app.settled()
  return app.get(watches)!
}

const until = async (done: () => boolean) => {
  for (let tries = 0; tries < 500 && !done(); tries++) await Bun.sleep(10)
  expect(done()).toBe(true)
}

const input = z.object({ name: z.string() })

const fakeKind = (service: Watches) => {
  const live = new Map<string, KindContext>()
  const kind: Kind<typeof input> = {
    name: 'fake',
    label: 'Fake',
    description: 'Emits when the test says so',
    input,
    describe: ({ name }) => `fake ${name}`,
    start: (_, context) => {
      live.set(context.id, context)
      return { info: { url: `fake://${context.id}` }, stop: () => void live.delete(context.id) }
    },
  }
  const unregister = service.kind(kind)
  const emit = (id: string, ...summaries: string[]) => {
    for (const summary of summaries) live.get(id)!.emit({ at: Date.now(), from: 'fake', summary })
  }
  return { live, emit, unregister }
}

const handled = (service: Watches, run: (changes: Change[]) => Promise<void> | void = () => {}) => {
  const batches: string[][] = []
  service.handle('test', async (_, changes) => {
    batches.push(changes.map(change => change.summary))
    await run(changes)
  })
  return batches
}

const create = (service: Watches) => service.create({ owner: 'test', subject: 'a', kind: 'fake', input: { name: 'x' }, label: 'Fake x' })

test('a burst of changes reaches the owner as one batch, and later ones as the next', async () => {
  const service = await start()
  const { emit } = fakeKind(service)
  const batches = handled(service)
  const watch = await create(service)
  expect(watch).toMatchObject({ target: 'fake x', info: { url: `fake://${watch.id}` } })

  emit(watch.id, 'a', 'b', 'c')
  await until(() => batches.length === 1)
  emit(watch.id, 'd')
  await until(() => batches.length === 2)
  expect(batches).toEqual([['a', 'b', 'c'], ['d']])
  expect(service.get(watch.id)?.changed).toBeNumber()
})

test('changes that come while the owner handles a batch go out together once it is done', async () => {
  const service = await start()
  const { emit } = fakeKind(service)
  const { promise: release, resolve } = Promise.withResolvers<void>()
  const batches = handled(service, () => (batches.length === 1 ? release : undefined))
  const watch = await create(service)

  emit(watch.id, 'a')
  await until(() => batches.length === 1)
  emit(watch.id, 'b')
  await Bun.sleep(100)
  emit(watch.id, 'c')
  await Bun.sleep(100)
  expect(batches).toEqual([['a']])

  resolve()
  await until(() => batches.length === 2)
  expect(batches).toEqual([['a'], ['b', 'c']])
})

test("a watch's state and its pending changes, even ones being handled, last across a restart, and its kind starts it again", async () => {
  const before = await start()
  const { live, emit } = fakeKind(before)
  const stuck = handled(before, () => new Promise(() => {}))
  const watch = await create(before)
  live.get(watch.id)!.save({ offset: 3 })
  emit(watch.id, 'a')
  await until(() => stuck.length === 1)
  emit(watch.id, 'b')

  const after = await start()
  const batches = handled(after)
  await until(() => batches.length === 1)
  expect(batches).toEqual([['a', 'b']])

  const kind = fakeKind(after)
  expect(kind.live.get(watch.id)?.state).toEqual({ offset: 3 })
  kind.unregister()
  await until(() => kind.live.size === 0)
  expect(after.get(watch.id)).toMatchObject({ target: 'fake x' })
})

test('a full queue keeps the newest changes and says how many it dropped', async () => {
  const service = await start()
  const { emit } = fakeKind(service)
  const watch = await create(service)
  const summaries = Array.from({ length: 53 }, (_, index) => `s${index}`)
  emit(watch.id, ...summaries)

  const batches = handled(service)
  await until(() => batches.length === 1)
  expect(batches[0]).toEqual(['3 earlier changes were dropped', ...summaries.slice(3)])
})

test('a batch the owner fails on is kept and tried again with what came since', async () => {
  const service = await start()
  const { emit } = fakeKind(service)
  const batches = handled(service, () => {
    if (batches.length === 1) throw new Error('no model picked')
  })
  const watch = await create(service)

  emit(watch.id, 'a')
  await until(() => service.get(watch.id)?.error === 'no model picked')
  emit(watch.id, 'b')
  await until(() => batches.length === 2)
  expect(batches).toEqual([['a'], ['a', 'b']])
})

test('removing a watch stops it and forgets its pending changes, and unknown kinds are refused', async () => {
  const service = await start()
  const { live, emit } = fakeKind(service)
  const watch = await create(service)
  const context = live.get(watch.id)!
  emit(watch.id, 'a')

  expect(service.remove(watch.id)).toBe(true)
  expect(context.signal.aborted).toBe(true)
  expect(live.size).toBe(0)
  context.emit({ at: Date.now(), from: 'fake', summary: 'late' })
  const batches = handled(service)
  await Bun.sleep(100)
  expect(batches).toEqual([])
  expect(service.list('test')).toEqual([])

  await expect(service.create({ owner: 'test', subject: 'a', kind: 'weather', input: {}, label: 'Weather' })).rejects.toThrow('No watch kind named weather')
})

const bunShell: ShellRunner = {
  name: 'bun',
  async run(command, { cwd }) {
    const child = Bun.spawn([process.execPath, '-e', command], { cwd, stdout: 'pipe', stderr: 'pipe' })
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    return { code, timedOut: false, stdout, stderr }
  },
  start() {
    throw new Error('Not used')
  },
}

test('a command watch stays quiet on its first run and passes the new output once it changes', async () => {
  dir = mkdtempSync(join(tmpdir(), 'sand-watches-'))
  const file = join(dir, 'status.txt')
  writeFileSync(file, 'one\nsame\n')
  const command = `process.stdout.write(require('fs').readFileSync(${JSON.stringify(file)}, 'utf8'))`

  const before = await start(bunShell)
  const quiet = handled(before)
  const watch = await before.create({ owner: 'test', subject: 'a', kind: 'command', input: { command, cwd: dir }, label: 'Status' })
  expect(watch).toMatchObject({ target: command, input: { every_minutes: 5 } })
  await Bun.sleep(1000)
  expect(quiet).toEqual([])

  writeFileSync(file, 'two\nsame\n')
  const after = await start(bunShell)
  const changes: Change[] = []
  handled(after, batch => void changes.push(...batch))
  await until(() => changes.length === 1)
  expect(changes[0]?.from).toBe(command)
  expect(changes[0]?.detail).toContain('- one\n+ two')
  expect(changes[0]?.detail).toContain('Output now:\ntwo\nsame')
})
