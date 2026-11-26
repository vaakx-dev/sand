import { startSand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { devServerList, devServerShare, devServerStop, sharedSiteEntry } from '../src/contract'

let sand: Awaited<ReturnType<typeof startSand>>

afterEach(() => sand.stop())

const start = async () => {
  sand = await startSand([{ id: 'replay', models: ['m'], replies: [], api: 'anthropic' }], { plugins: ['agent/processes', 'agent/dev-servers'] })
  const thread = sand.chat('replay/m')
  return { thread, asThread: sand.askAs({ device: 'sand', kind: 'agent', actor: { owner: 'thread', id: thread.id } }) }
}

const site = async (home: string) => {
  const root = join(home, 'tide-site')
  await mkdir(join(root, 'charts'), { recursive: true })
  await Promise.all([
    Bun.write(join(root, 'index.html'), '<!doctype html><title>Tide tables</title>'),
    Bun.write(join(root, 'style.css'), 'body { color: teal }'),
    Bun.write(join(root, 'charts', 'index.html'), '<!doctype html><title>Charts</title>'),
    Bun.write(join(home, 'secret.txt'), 'outside the site'),
  ])
  return root
}

const page = (port: number, path: string) => fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual' })

test("a shared folder is served as a site its thread lists and links to in its chat, with nothing outside the folder, until Stop ends it", async () => {
  const { thread, asThread } = await start()
  const root = await site(sand.home)

  const shared = await asThread(devServerShare, { folder: relative(thread.cwd, root) })
  const { port } = shared

  expect(await sand.ask(devServerList, { session: thread.id })).toEqual([shared])
  expect(thread.path().filter(entry => entry.type === sharedSiteEntry).map(entry => entry.data)).toEqual([{ port, title: 'tide-site' }])

  const home = await page(port, '/')
  expect(home.headers.get('content-type')).toStartWith('text/html')
  expect(await home.text()).toContain('Tide tables')
  expect((await page(port, '/style.css')).headers.get('content-type')).toStartWith('text/css')
  expect((await page(port, '/charts')).headers.get('location')).toBe('/charts/')
  expect(await (await page(port, '/charts/')).text()).toContain('Charts')
  for (const escape of ['/..%2fsecret.txt', '/%2e%2e/secret.txt', '/charts/..%5c..%5csecret.txt', '/missing.html']) expect((await page(port, escape)).status).toBe(404)

  expect(await sand.ask(devServerStop, { port })).toBe(true)
  expect(await sand.ask(devServerList, { session: thread.id })).toEqual([])
  expect(await page(port, '/').then(() => 'answered', () => 'refused')).toBe('refused')
})

test("sharing a port asks for a server the thread started, and sharing needs the thread's own chat", async () => {
  const { thread, asThread } = await start()
  const stranger = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }) })

  await expect(asThread(devServerShare, { port: stranger.port ?? 0, title: 'Tide tables' })).rejects.toThrow(`port ${stranger.port}`)
  await expect(sand.ask(devServerShare, { folder: sand.home })).rejects.toThrow('thread or bot')
  expect(thread.path().filter(entry => entry.type === sharedSiteEntry)).toEqual([])
  stranger.stop(true)
})
