import { loadPcIdentity } from '@sand/devices-identity/pc'
import { startSand, type Sand } from '@sand/harness'
import { createHandlers } from '@sand/host-hub/contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { projectCreate, projectRemove, projectRoot, projectRows, projectUpdate } from '../src/contract'
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
  sand.app.provide(hostChannel, { call: (request, input) => host.ask(request, input, { device, kind: 'runtime' }), on: () => () => {} })
})

afterAll(() => sand.stop())

test('the page creates, renames, removes projects and sets where new ones go through the requests agents use', async () => {
  const folder = join(sand.home, 'Projects')
  expect(await sand.ask(projectRoot, { folder })).toEqual({ root: folder })

  const { project } = await sand.ask(projectCreate, { name: 'alpha' })
  expect(existsSync(join(folder, 'alpha'))).toBe(true)
  expect(await sand.ask(projectUpdate, { project, name: 'Alpha', hidden: true })).toMatchObject({ name: 'Alpha', hidden: true })

  expect(await sand.ask(projectRemove, { project })).toEqual({ project, removed: true })
  expect((await sand.ask(projectRows, {})).map(row => row.project)).not.toContain(project)
})
