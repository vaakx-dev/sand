import { loadPcIdentity } from '@sand/devices-identity/pc'
import { startSand, type Sand } from '@sand/harness'
import { createHandlers } from '@sand/host-hub/contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { afterAll, beforeAll, expect, spyOn, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { projectAction } from '../src/cli/actions'
import { projectCreate, projectRemove, projectRoot, projectRows, projectUpdate, type ProjectRow } from '../src/contract'
import { manageRequests } from '../src/manage/requests'
import { createRegistry } from '../src/registry/registry'
import { projectRoot as loadRoot } from '../src/registry/root'
import { projectStore } from '../src/registry/store'

let sand: Sand

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins: ['project'] })
  const device = (await loadPcIdentity(sand.home)).id
  const store = await projectStore(sand.home, error => {
    throw error
  })
  const registry = createRegistry(store, device, { changed() {}, pull: async () => {}, git: () => undefined })
  const host = createHandlers()
  const root = await loadRoot(sand.home)
  for (const setup of manageRequests({ hub: host, registry, root, device, pcs: () => [{ id: device, name: 'Desk' }], git: () => undefined, placeChanged() {} })) setup()
  sand.app.provide(hostChannel, { call: (request, input) => host.ask(request, input, { device, kind: 'runtime' }), ask: host.ask, on: () => () => {} })
})

afterAll(() => sand.stop())

test('the page creates, renames, removes projects and sets where new ones go through the requests agents use', async () => {
  const folder = join(sand.home, 'Projects')
  expect(await sand.ask(projectRoot, { folder })).toEqual({ root: folder })

  const { project } = await sand.ask(projectCreate, { name: 'alpha' })
  expect(existsSync(join(folder, 'alpha'))).toBe(true)
  expect(await sand.ask(projectUpdate, { project, name: 'Alpha', archived: true })).toMatchObject({ name: 'Alpha', archived: true })

  expect(await sand.ask(projectRemove, { project })).toEqual({ project, removed: true })
  expect((await sand.ask(projectRows, {})).map(row => row.project)).not.toContain(project)
})

test('sand project pins and archives projects by name, listing pinned ones first and archived ones last', async () => {
  const printed = spyOn(console, 'log').mockImplementation(() => {})
  const project = async (...args: string[]) => {
    printed.mockClear()
    const action = projectAction(args, true)
    if (!action) throw new Error(`sand project ${args.join(' ')} is not a command`)
    await action(sand.ask)
    return JSON.parse(String(printed.mock.calls.at(-1)?.[0])) as ProjectRow[]
  }
  const names = (rows: ProjectRow[]) => rows.map(row => row.name)
  for (const name of ['harbor', 'lantern', 'quarry']) await sand.ask(projectCreate, { name })

  await project('pin', 'quarry')
  await project('archive', 'Harbor')
  expect(names(await project('list'))).toEqual(['quarry', 'lantern', 'harbor'])

  expect(await project('pin', 'harbor')).toEqual([expect.objectContaining({ name: 'harbor', pinned: true })])
  expect(names(await project('list')).slice(0, 2)).toEqual(expect.arrayContaining(['harbor', 'quarry']))
  await expect(project('archive', 'ferry')).rejects.toThrow('No project called ferry')
  expect(projectAction(['pin'], true)).toBeUndefined()
  printed.mockRestore()
})
