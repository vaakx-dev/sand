import { errorMessage, uuid } from '@sand/util'
import { isMissing, moveFresh, removeFolder } from '@sand/util/fs'
import { addonFault, type AddonFault, type AddonListing, type AddonStamp, addonStampFile, installedAddons } from '@sand/util/release'
import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { z } from 'zod'

const DOWNLOAD_TIMEOUT_MS = 5 * 60_000

const stampSchema = z.object({ id: z.string(), source: z.string(), version: z.string(), hash: z.string(), sha256: z.string() })

interface Download {
  root: string
  listing: AddonListing
  catalogUrl: string
  source: string
}

const sha256 = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

const safePath = (path: string) => !path.includes('\\') && !/^[a-zA-Z]:/.test(path) && path.split('/').every(segment => segment && segment !== '.' && segment !== '..')

const download = async (listing: AddonListing, catalogUrl: string) => {
  const url = new URL(listing.file, catalogUrl)
  const response = await fetch(url, { headers: { 'user-agent': 'sand' }, signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }).catch((error: unknown) => {
    throw new Error(`Couldn't download ${listing.label}: ${errorMessage(error)}`)
  })
  if (!response.ok) throw new Error(`Couldn't download ${listing.label}: HTTP ${response.status}`)
  const bytes = await response.bytes()
  if (bytes.length !== listing.size || sha256(bytes) !== listing.sha256) throw new Error(`The ${listing.label} download doesn't match the catalog, so sand left it out`)
  return bytes
}

const unpack = async (bytes: Uint8Array, folder: string) => {
  const files = await new Bun.Archive(bytes).files()
  const unsafe = [...files.keys()].find(path => !safePath(path))
  if (unsafe) throw new Error(`The add-on holds a file outside its folder: ${unsafe}`)
  for (const [path, file] of files) await Bun.write(join(folder, ...path.split('/')), file)
}

const stampOf = ({ id, version, hash, sha256: fingerprint }: AddonListing, source: string): AddonStamp => ({ id, source, version, hash, sha256: fingerprint })

const setAside = (target: string, old: string) =>
  moveFresh(target, old).then(
    () => true,
    (error: unknown) => {
      if (isMissing(error)) return false
      throw error
    },
  )

const replace = async (staging: string, target: string) => {
  const old = `${staging}-old`
  const had = await setAside(target, old)
  try {
    await moveFresh(staging, target)
  } catch (error) {
    if (had) await moveFresh(old, target)
    throw error
  }
  if (had) await removeFolder(old)
}

const stageFolder = async ({ root, listing, catalogUrl, source }: Download) => {
  const bytes = await download(listing, catalogUrl)
  const staging = join(root, `.${listing.id}-${uuid()}`)
  try {
    await unpack(bytes, staging)
    await Bun.write(join(staging, addonStampFile), `${JSON.stringify(stampOf(listing, source), null, 2)}\n`)
    return staging
  } catch (error) {
    await removeFolder(staging)
    throw error
  }
}

const placeFolder = async (root: string, id: string, staging: string) => {
  try {
    await replace(staging, join(root, id))
  } finally {
    await removeFolder(staging)
  }
}

const installFolder = async (download: Download) => placeFolder(download.root, download.listing.id, await stageFolder(download))

const readStamp = async (folder: string): Promise<AddonStamp | undefined> => {
  const stamp: unknown = await Bun.file(join(folder, addonStampFile))
    .json()
    .catch(() => undefined)
  const parsed = stampSchema.safeParse(stamp)
  return parsed.success ? parsed.data : undefined
}

const installedStamps = async (root: string) => {
  const folders = await installedAddons(root)
  const stamps = await Promise.all(folders.map(readStamp))
  return new Map(folders.flatMap((folder, index) => (stamps[index] ? [[basename(folder), stamps[index]] as const] : [])))
}

const faultsFor = async (root: string, ids: string[], build: string) => {
  const faults = await Promise.all(ids.map(id => addonFault(join(root, id))))
  return new Map(ids.flatMap((id, index): [string, AddonFault][] => (faults[index]?.build === build ? [[id, faults[index]]] : [])))
}

const removeAddonFolder = (root: string, id: string) => removeFolder(join(root, id))

const STAGING = /^\.[a-z0-9][a-z0-9-]*-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-old)?$/

const removeLeftovers = async (root: string) => {
  const names = (await readdir(root).catch(() => [])).filter(name => STAGING.test(name))
  await Promise.all(names.map(name => removeFolder(join(root, name)).catch(() => {})))
}

export { faultsFor, installedStamps, installFolder, placeFolder, removeAddonFolder, removeLeftovers, stageFolder, type Download }
