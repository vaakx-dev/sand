import { runtimeDeps } from '@sand/boot/build'
import { compare } from '@sand/util'
import { type AddonListing, addonAsset, type AppFile, hashFiles, moduleFiles } from '@sand/util/release'
import type { Addon } from './split'

interface PackedAddon {
  listing: AddonListing
  bytes: Uint8Array
}

const PROVIDED = new Set(['drydock', 'zod', '@vaakx-dev/vrui'])

const PLUGINS = 'plugins/'

const inside = (path: string, folder: string) => path.startsWith(`${folder}/`)

const ownFiles = (files: AppFile[], addon: Addon) =>
  files.filter(file => addon.packages.some(workspace => inside(file.path, workspace.path))).map(file => ({ ...file, path: file.path.slice(PLUGINS.length) }))

const moduleBytes = async (root: string, addon: Addon): Promise<AppFile[]> => {
  const found = await moduleFiles(await runtimeDeps(root, { packages: addon.packages, provided: PROVIDED }))
  return Promise.all(found.map(async ({ path, file }) => ({ path, bytes: await Bun.file(file).bytes() })))
}

const sha256 = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

const packAddon = async (root: string, addon: Addon, files: AppFile[], version: string): Promise<PackedAddon> => {
  const contents = [...ownFiles(files, addon), ...(await moduleBytes(root, addon))].toSorted((a, b) => compare(a.path, b.path))
  const bytes = await new Bun.Archive(Object.fromEntries(contents.map(file => [file.path, file.bytes])), { compress: 'gzip' }).bytes()
  const { id, label, summary, needs } = addon
  const listing = { id, label, summary, version, sand: `>=${version}`, needs, file: addonAsset(id), size: bytes.length, sha256: sha256(bytes), hash: hashFiles(contents) }
  return { listing, bytes }
}

export { inside, packAddon }
