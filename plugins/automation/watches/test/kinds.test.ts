import type { RouteHandler } from '@sand/server/contract'
import { debouncedWatch, type WatchOptions } from '@sand/util/fs'
import { afterEach, expect, test } from 'bun:test'
import { appendFileSync, closeSync, mkdirSync, mkdtempSync, openSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Change, KindContext, Started } from '../src/contract'
import { fileKind } from '../src/kinds/file'
import { folderKind } from '../src/kinds/folder'
import { webhookKind } from '../src/kinds/webhook'

const cleanups: (() => unknown)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

const watcher = { debounced: (dir: string, options: WatchOptions, onChange: () => void) => debouncedWatch(dir, options, onChange, 50) }

const tempFolder = () => {
  const dir = mkdtempSync(join(tmpdir(), 'sand-watches-'))
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

const watching = (state?: unknown) => {
  const changes: Change[] = []
  const errors: unknown[] = []
  const context: KindContext = {
    id: 'watch',
    state,
    save: next => void (context.state = next),
    emit: change => void changes.push(change),
    fail: error => void errors.push(error),
    signal: new AbortController().signal,
  }
  const started = (running: Started | void) => {
    if (running?.stop) cleanups.push(running.stop)
    return running
  }
  const until = async (done: () => boolean) => {
    const deadline = Date.now() + 5_000
    while (!done()) {
      if (errors.length) throw errors[0]
      if (Date.now() > deadline) throw new Error(`timed out with ${JSON.stringify(changes)}`)
      await Bun.sleep(20)
    }
  }
  return { context, changes, started, until }
}

test('a log file reports only new complete lines that match, and starts over when truncated', async () => {
  const log = join(tempFolder(), 'app.log')
  writeFileSync(log, 'error from before the watch\n')
  const { context, changes, started, until } = watching()
  started(await fileKind(watcher).start({ path: log, pattern: 'error' }, context))

  appendFileSync(log, 'all fine\nERROR disk full\nerror half')
  await until(() => changes.length === 1)
  expect(changes[0]).toMatchObject({ from: log, summary: 'ERROR disk full' })

  appendFileSync(log, ' written\nfine again\n')
  await until(() => changes.length === 2)
  expect(changes[1]!.summary).toBe('error half written')

  writeFileSync(log, 'error after rotate\n')
  await until(() => changes.length === 3)
  expect(changes.map(change => change.summary)).toEqual(['ERROR disk full', 'error half written', 'error after rotate'])
})

test('a log file notices lines a writer appends through a handle it keeps open', async () => {
  const log = join(tempFolder(), 'held.log')
  writeFileSync(log, '')
  const { context, changes, started, until } = watching()
  started(await fileKind({ debounced: () => () => {} }, 50).start({ path: log, pattern: 'error' }, context))

  const handle = openSync(log, 'a')
  cleanups.unshift(() => closeSync(handle))
  writeSync(handle, 'ERROR held open\n')
  await until(() => changes.length === 1)
  expect(changes[0]!.summary).toBe('ERROR held open')
})

test('a folder reports added, changed and removed files, skipping node_modules', async () => {
  const root = tempFolder()
  writeFileSync(join(root, 'a.txt'), 'one')
  mkdirSync(join(root, 'node_modules'))
  const { context, changes, started, until } = watching()
  started(await folderKind(watcher).start({ path: root, recursive: true }, context))

  const reported = () => changes.flatMap(change => change.detail?.split('\n') ?? [])
  writeFileSync(join(root, 'a.txt'), 'one more')
  writeFileSync(join(root, 'b.txt'), 'new')
  writeFileSync(join(root, 'node_modules', 'dep.js'), 'ignored')
  mkdirSync(join(root, 'sub'))
  writeFileSync(join(root, 'sub', 'c.txt'), 'nested')
  await until(() => ['~ a.txt', '+ b.txt', '+ sub/c.txt'].every(line => reported().includes(line)))

  rmSync(join(root, 'b.txt'))
  await until(() => changes.at(-1)?.summary === 'removed b.txt')
  expect(reported().filter(line => line.includes('node_modules'))).toEqual([])
})

test('a webhook turns a POST into a change and keeps its URL across restarts', async () => {
  const routes = new Map<string, RouteHandler>()
  const route = (path: string, handler: RouteHandler) => {
    routes.set(path, handler)
    return () => void routes.delete(path)
  }
  const listener = Bun.serve({ port: 0, fetch: request => routes.get(new URL(request.url).pathname)?.(request) ?? new Response('not found', { status: 404 }) })
  cleanups.push(() => listener.stop(true))
  const kind = webhookKind({ route }, async () => `http://127.0.0.1:${listener.port}`)

  const first = watching()
  const url = (await kind.start({}, first.context))?.info?.url ?? ''
  const reply = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'ci-bot', 'x-forwarded-for': '10.0.0.5' },
    body: JSON.stringify({ title: 'Deploy finished', ok: true }),
  })
  expect(reply.status).toBe(202)
  expect(first.changes).toEqual([{ at: expect.any(Number), from: '10.0.0.5 (ci-bot)', summary: 'Deploy finished', detail: '{\n  "title": "Deploy finished",\n  "ok": true\n}' }])
  expect((await fetch(url)).status).toBe(405)

  const again = watching(first.context.state)
  expect((await kind.start({}, again.context))?.info?.url).toBe(url)
  await fetch(url, { method: 'PUT', body: 'plain text ping' })
  expect(again.changes.map(change => change.summary)).toEqual(['plain text ping'])
})
