import type { Features } from '@sand/config/contract'
import type { AddonListing } from '@sand/util/release'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAddons } from '../src/addons/actions'
import { sourceStore } from '../src/addons/sources'

interface Published {
  listing: AddonListing
  bytes: Uint8Array<ArrayBuffer>
}

const homes: string[] = []
const servers: { stop(): void }[] = []

afterEach(() => {
  for (const server of servers.splice(0)) server.stop()
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

const sha256 = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

const publish = async (version: string, sand = '>=1.0.0', id = 'notes'): Promise<Published> => {
  const bytes = await new Bun.Archive({ [`${id}/package.json`]: JSON.stringify({ name: `@sand/${id}`, version }) }, { compress: 'gzip' }).bytes()
  const listing = { id, label: 'Notes', summary: 'Keeps notes', version, sand, needs: [], file: `${id}.tar.gz`, size: bytes.length, sha256: sha256(bytes), hash: version, readme: '# Notes', pictures: [] }
  return { listing, bytes }
}

const serve = (shelf: { catalog: AddonListing[]; file: Uint8Array<ArrayBuffer> }) => {
  const server = Bun.serve({
    port: 0,
    fetch: request => (new URL(request.url).pathname === '/catalog.json' ? Response.json({ addons: shelf.catalog }) : new Response(shelf.file)),
  })
  servers.push(server)
  return `http://127.0.0.1:${server.port}/catalog.json`
}

const features: Features = { list: () => [], on: () => true, set: async () => {}, refresh: async () => {} }
const runtimes = { swap: async () => true }

const setup = (shelf: { catalog: AddonListing[]; file: Uint8Array<ArrayBuffer> }, version = '1.0.0') => {
  const home = mkdtempSync(join(tmpdir(), 'sand-addons-'))
  homes.push(home)
  const url = serve(shelf)
  const root = join(home, 'plugins')
  const main = { id: 'vaakx-dev/sand', label: 'vaakx-dev/sand', removable: false, url: async () => url }
  return { root, addons: createAddons({ root, version, features, runtimes, main, saved: sourceStore(home) }) }
}

const installedVersion = async (root: string) => (await Bun.file(join(root, 'notes', 'notes', 'package.json')).json()).version

test('an add-on installs from the catalog, updates to a newer one, and is deleted when removed', async () => {
  const first = await publish('1.0.0')
  const shelf = { catalog: [first.listing], file: first.bytes }
  const { root, addons } = setup(shelf)

  const installed = await addons.install(['notes'])
  expect(installed.addons).toEqual([{ id: 'notes', label: 'Notes', summary: 'Keeps notes', readme: '# Notes', pictures: [], source: { id: 'vaakx-dev/sand', label: 'vaakx-dev/sand' }, status: 'installed', version: '1.0.0' }])
  expect(await installedVersion(root)).toBe('1.0.0')

  const second = await publish('1.1.0')
  Object.assign(shelf, { catalog: [second.listing], file: second.bytes })
  await addons.update(['notes'])
  expect(await installedVersion(root)).toBe('1.1.0')

  expect((await addons.remove(['notes'])).addons.map(addon => addon.status)).toEqual(['available'])
  expect(await Bun.file(join(root, 'notes', 'notes', 'package.json')).exists()).toBe(false)
})

test('a download that differs from its fingerprint in the catalog is rejected and leaves the installed one in place', async () => {
  const first = await publish('1.0.0')
  const shelf = { catalog: [first.listing], file: first.bytes }
  const { root, addons } = setup(shelf)
  await addons.install(['notes'])

  const second = await publish('1.1.0')
  Object.assign(shelf, { catalog: [second.listing], file: (await publish('6.6.6')).bytes })
  expect(addons.update(['notes'])).rejects.toThrow("doesn't match the catalog")
  expect(await installedVersion(root)).toBe('1.0.0')
})

test('an add-on that needs a newer sand is listed but not installed', async () => {
  const newer = await publish('2.0.0', '>=2.0.0')
  const { root, addons } = setup({ catalog: [newer.listing], file: newer.bytes })
  expect((await addons.choice()).addons[0]).toMatchObject({ status: 'available', needsSand: '>=2.0.0' })
  expect(addons.install(['notes'])).rejects.toThrow('needs a newer sand')
  expect(await Bun.file(join(root, 'notes')).exists()).toBe(false)
})

test("an add-on from another source installs, says where it comes from, and stays when that source is removed", async () => {
  const own = await publish('1.0.0')
  const { root, addons } = setup({ catalog: [own.listing], file: own.bytes })
  const theirs = await publish('0.3.0', '>=1.0.0', 'spectra')
  const other = serve({ catalog: [theirs.listing], file: theirs.bytes })

  const added = await addons.addSource(other)
  const source = added.sources.find(found => found.removable)!
  expect(added.addons.find(addon => addon.id === 'spectra')?.source).toEqual({ id: source.id, label: source.label })

  await addons.install(['spectra'])
  await addons.removeSource(source.id)
  const after = await addons.choice()
  expect(after.sources.map(found => found.id)).toEqual(['vaakx-dev/sand'])
  expect(after.addons.find(addon => addon.id === 'spectra')?.status).toBe('installed')
  expect(await Bun.file(join(root, 'spectra', 'spectra', 'package.json')).exists()).toBe(true)
})

test('a source without a catalog sand can read is not added', async () => {
  const own = await publish('1.0.0')
  const { addons } = setup({ catalog: [own.listing], file: own.bytes })
  const broken = Bun.serve({ port: 0, fetch: () => new Response('not a catalog') })
  servers.push(broken)
  expect(addons.addSource(`http://127.0.0.1:${broken.port}/sand-addons.json`)).rejects.toThrow("isn't one sand can read")
  expect((await addons.choice()).sources).toHaveLength(1)
})
