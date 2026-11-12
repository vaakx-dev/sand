import { pairPcs, startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import type { Reply } from '@sand/replay/contract'
import { server } from '@sand/server/contract'
import { afterEach, expect, setSystemTime, test } from 'bun:test'
import { resolve } from 'node:path'
import { logbookAdd, logbookChange, logbookChanged, logbookRemove, logbookSearch, logbookTags } from '../src/contract'

let sand: Sand
let others: Sand[] = []

afterEach(async () => {
  setSystemTime()
  await Promise.all([sand, ...others].map(running => running.stop()))
  others = []
})

const said = (text: string): Reply => [{ type: 'text', text }]

const use = (name: string, input: Record<string, unknown>): Reply => [{ type: 'call', name, input }]

const start = (replies: Reply[] = []) =>
  startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }], {
    plugins: ['agent/mcp-server', 'agent/logbook'],
    projects: ['tiles', 'garden'].map(project => ({ project, path: resolve('work', project) })),
  })

const threadIn = (project: string | null, on = sand) => {
  const session = on.sessions.thread(on.home, { project })
  on.app.get(modelSettings)!.change(session, { model: 'fake/m' })
  return session
}

const changes = (on: Sand, count: number) =>
  new Promise<void>(resolve => {
    const hub = on.app.get(server)!
    let heard = 0
    hub.broadcast = event => {
      if (event.id === logbookChanged.id && ++heard === count) resolve()
    }
  })

const titles = (entries: { title: string }[]) => entries.map(entry => entry.title)

test('a thread logs finished work as itself in its project, and the Logbook finds it by words, tag, project and date', async () => {
  const merge = { title: 'Faster merges', details: 'Merging a thread went from 1.9 s to 1.1 s.', tags: ['git', 'speed'], links: ['https://github.com/acme/tiles/pull/317'] }
  sand = await start([use('logbook_add', merge), said('Logged.')])
  setSystemTime(new Date('2025-10-14T12:00'))
  const thread = threadIn('tiles')
  sand.sessions.rename(thread.id, 'Speed up git')
  await sand.turns.run(thread, 'Log the merge speedup')

  setSystemTime(new Date('2025-11-03T09:00'))
  await sand.ask(logbookAdd, { project: 'garden', title: 'Watering schedule', tags: ['Plants', 'plants'] })
  await sand.ask(logbookAdd, { project: null, title: 'Renewed the domain' })

  const [logged] = await sand.ask(logbookSearch, { query: 'merg' })
  expect(logged).toMatchObject({ ...merge, project: 'tiles', author: { owner: 'thread', id: thread.id, name: 'Speed up git' } })
  expect(titles(await sand.ask(logbookSearch, { query: '317' }))).toEqual(['Faster merges'])
  expect(titles(await sand.ask(logbookSearch, { tag: 'plants' }))).toEqual(['Watering schedule'])
  expect(titles(await sand.ask(logbookSearch, { project: null }))).toEqual(['Renewed the domain'])
  expect(titles(await sand.ask(logbookSearch, { project: 'tiles' }))).toEqual(['Faster merges'])
  expect(titles(await sand.ask(logbookSearch, { from: new Date('2025-10-01T00:00').getTime(), to: new Date('2025-11-01T00:00').getTime() }))).toEqual(['Faster merges'])
  expect(titles(await sand.ask(logbookSearch, {}))).toEqual(['Renewed the domain', 'Watering schedule', 'Faster merges'])
  expect(await sand.ask(logbookTags, {})).toEqual([
    { tag: 'git', count: 1 },
    { tag: 'plants', count: 1 },
    { tag: 'speed', count: 1 },
  ])

  await sand.ask(logbookChange, { id: logged!.id, title: 'Faster merges and diffs', tags: ['git'] })
  await sand.ask(logbookRemove, { id: (await sand.ask(logbookSearch, { tag: 'plants' }))[0]!.id })
  expect(await sand.ask(logbookSearch, { query: 'diffs' })).toMatchObject([{ title: 'Faster merges and diffs', details: merge.details, author: { name: 'Speed up git' } }])
  expect(await sand.ask(logbookTags, {})).toEqual([{ tag: 'git', count: 1 }])
  await expect(sand.ask(logbookChange, { id: 'nothing', title: 'x' })).rejects.toThrow('No Logbook entry nothing')
})

test('entries reach the other PC, and edits made while apart merge when the PCs reconnect, the later one winning', async () => {
  sand = await start()
  const box = await start()
  others.push(box)
  const { toBox, toHome } = pairPcs(sand, box)

  const reached = changes(box, 2)
  const added = await sand.ask(logbookAdd, { project: 'tiles', title: 'Shipped tiles 1.0' })
  const doomed = await sand.ask(logbookAdd, { project: 'tiles', title: 'Draft notes' })
  await reached
  expect(titles(await box.ask(logbookSearch, {}))).toEqual(['Draft notes', 'Shipped tiles 1.0'])

  toBox.drop()
  toHome.drop()
  const apart = Date.now() + 60_000
  setSystemTime(apart)
  await sand.ask(logbookChange, { id: added.id, title: 'Shipped tiles 1.0 from home' })
  await sand.ask(logbookRemove, { id: doomed.id })
  setSystemTime(apart + 1000)
  await box.ask(logbookChange, { id: added.id, title: 'Shipped tiles 1.0 on the box' })
  setSystemTime()

  const merged = Promise.all([changes(sand, 1), changes(box, 1)])
  toHome.open()
  toBox.open()
  await merged

  expect(titles(await sand.ask(logbookSearch, {}))).toEqual(['Shipped tiles 1.0 on the box'])
  expect(titles(await box.ask(logbookSearch, {}))).toEqual(['Shipped tiles 1.0 on the box'])
})
