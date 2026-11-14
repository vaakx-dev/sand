import { type Caller, createHandlers, type Request } from '@sand/host-hub/contract'
import { afterAll, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runtimeProjectCreate, runtimeProjectRemove, runtimeProjectRoot, runtimeProjectRows, runtimeProjectUpdate } from '../src/contract'
import { manageRequests } from '../src/manage/requests'
import { createRegistry } from '../src/registry/registry'
import { projectRoot } from '../src/registry/root'
import { projectStore } from '../src/registry/store'

const home = mkdtempSync(join(tmpdir(), 'sand-manage-'))
const runtime: Caller = { device: 'runtime', kind: 'runtime' }

afterAll(() => rmSync(home, { recursive: true, force: true }))

const start = async () => {
  const store = await projectStore(home, error => {
    throw error
  })
  const registry = createRegistry(store, 'desk', { changed() {}, pull: async () => {}, git: () => undefined })
  const root = await projectRoot(home)
  const hub = createHandlers()
  const pcs = () => [
    { id: 'desk', name: 'Desk' },
    { id: 'laptop', name: 'Laptop' },
  ]
  for (const setup of manageRequests({ hub, registry, root, device: 'desk', pcs, git: () => undefined, placeChanged() {} })) setup()
  return { registry, ask: <I, O>(request: Request<I, O>, input: I) => hub.ask(request, input, runtime) }
}

test('agents add, create, update and remove projects, and choose where new ones go', async () => {
  const { registry, ask } = await start()
  const newRoot = join(home, 'Projects')
  expect(await ask(runtimeProjectRoot, { folder: newRoot })).toEqual({ root: newRoot })

  const empty = await ask(runtimeProjectCreate, { name: 'alpha' })
  expect(empty).toEqual({ project: expect.any(String), name: 'alpha', folder: join(newRoot, 'alpha') })
  expect(existsSync(join(newRoot, 'alpha'))).toBe(true)
  await expect(ask(runtimeProjectCreate, { name: 'alpha' })).rejects.toThrow('already exists')

  const folder = join(home, 'code', 'beta')
  const added = await ask(runtimeProjectCreate, { folder, name: 'Beta app' })
  expect(added).toMatchObject({ name: 'Beta app', folder })
  expect(await ask(runtimeProjectCreate, { folder })).toMatchObject({ project: added.project })

  const updated = await ask(runtimeProjectUpdate, { project: added.project, name: 'Beta', pinned: true, icon: { shape: 3, hue: 120 } })
  expect(updated).toMatchObject({ name: 'Beta', pinned: true, icon: { shape: 3, hue: 120 } })
  const archived = await ask(runtimeProjectUpdate, { project: added.project, archived: true })
  expect(archived).toMatchObject({ archived: true })
  expect(archived).not.toHaveProperty('pinned')
  const repinned = await ask(runtimeProjectUpdate, { project: added.project, pinned: true })
  expect(repinned).toMatchObject({ pinned: true })
  expect(repinned).not.toHaveProperty('archived')

  const synced = await registry.find(added.project)
  await registry.merge([{ ...synced, copies: { ...synced.copies, laptop: { path: '/home/me/beta', added: 1, updated: 1 } } }])
  expect(await ask(runtimeProjectRows, {})).toEqual([expect.objectContaining({ name: 'alpha' }), expect.objectContaining({ name: 'Beta', otherPcs: [{ pc: 'Laptop', folder: '/home/me/beta' }] })])

  const forgotten = await ask(runtimeProjectRemove, { project: added.project, pc: 'laptop' })
  expect(forgotten).toMatchObject({ project: added.project, folder })
  expect(forgotten).not.toHaveProperty('otherPcs')
  await expect(ask(runtimeProjectRemove, { project: added.project, pc: 'Laptop' })).rejects.toThrow('has no folder on Laptop')

  expect(await ask(runtimeProjectRemove, { project: empty.project })).toEqual({ project: empty.project, removed: true })
  expect((await ask(runtimeProjectRows, {})).map(row => row.name)).toEqual(['Beta'])
  expect(existsSync(join(newRoot, 'alpha'))).toBe(true)
})
