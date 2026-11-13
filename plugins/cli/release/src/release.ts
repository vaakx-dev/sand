import { appRoot } from '@sand/boot'
import { compare } from '@sand/util'
import { type AddonCatalog, addonCatalogAsset, type AppFile, appVersion, bundleAsset, hashApp, stampAsset } from '@sand/util/release'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { inside, packAddon } from './addon'
import { packBundle } from './bundle'
import { buildHistory } from './history'
import { type Addon, splitWorkspace } from './split'
import { contractStub, type Stub } from './stub'

const coreFiles = (files: AppFile[], addons: Addon[], stubs: Stub[]) => {
  const folders = addons.flatMap(addon => addon.packages.map(workspace => workspace.path))
  const kept = new Set(stubs.flatMap(stub => stub.files))
  const manifests = stubs.map(stub => ({ path: `${stub.workspace.path}/package.json`, bytes: stub.manifest }))
  const core = files.filter(file => kept.has(file.path) || !folders.some(folder => inside(file.path, folder)))
  return [...core, ...manifests].toSorted((a, b) => compare(a.path, b.path))
}

const releaseAssets = async ([folder]: string[]) => {
  if (!folder) throw new Error('usage: sand release-assets <folder>')
  const out = resolve(folder)
  await mkdir(out, { recursive: true })
  const root = appRoot(Bun.main)
  const [app, { core, addons }, version] = await Promise.all([hashApp(root), splitWorkspace(root), appVersion(root)])
  const stubs = await Promise.all(addons.flatMap(addon => addon.packages).map(contractStub))
  const parts = { files: coreFiles(app.files, addons, stubs), latest: app.latest, packages: [...core, ...stubs.map(stub => stub.workspace)] }
  const { stamp, bytes } = await packBundle(root, parts, await buildHistory(root))
  await Bun.write(join(out, bundleAsset), bytes)
  await Bun.write(join(out, stampAsset), JSON.stringify(stamp))
  console.log(`build ${stamp.id} (Bun ${stamp.bun}): ${join(out, bundleAsset)} (${bytes.length} bytes), ${join(out, stampAsset)}`)
  const packed = await Promise.all(addons.map(addon => packAddon(root, addon, app.files, version)))
  for (const { listing, bytes: addonBytes } of packed) await Bun.write(join(out, listing.file), addonBytes)
  const catalog: AddonCatalog = { addons: packed.map(({ listing }) => listing) }
  await Bun.write(join(out, addonCatalogAsset), `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`${packed.length} add-ons (${packed.reduce((sum, { listing }) => sum + listing.size, 0)} bytes), ${join(out, addonCatalogAsset)}`)
}

export { releaseAssets }
