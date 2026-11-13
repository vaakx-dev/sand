import { errorMessage, uuid } from '@sand/util'
import { removeFolder } from '@sand/util/fs'
import { addonFolders, type AddonListing, type AddonStamp, addonStampFile } from '@sand/util/release'
import { rename } from 'node:fs/promises'
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

const replace = async (staging: string, target: string) => {
  const old = `${staging}-old`
  const had = await rename(target, old).then(
    () => true,
    () => false,
  )
  await rename(staging, target)
  if (had) await removeFolder(old)
}

const installFolder = async ({ root, listing, catalogUrl, source }: Download) => {
  const bytes = await download(listing, catalogUrl)
  const staging = join(root, `.${listing.id}-${uuid()}`)
  try {
    await unpack(bytes, staging)
    await Bun.write(join(staging, addonStampFile), `${JSON.stringify(stampOf(listing, source), null, 2)}\n`)
    await replace(staging, join(root, listing.id))
  } finally {
    await removeFolder(staging)
  }
}

const readStamp = async (folder: string): Promise<AddonStamp | undefined> => {
  const stamp: unknown = await Bun.file(join(folder, addonStampFile))
    .json()
    .catch(() => undefined)
  const parsed = stampSchema.safeParse(stamp)
  return parsed.success ? parsed.data : undefined
}

const installedStamps = async (root: string) => {
  const folders = await addonFolders(root)
  const stamps = await Promise.all(folders.map(readStamp))
  return new Map(folders.flatMap((folder, index) => (stamps[index] ? [[basename(folder), stamps[index]] as const] : [])))
}

const removeAddonFolder = (root: string, id: string) => removeFolder(join(root, id))

export { installedStamps, installFolder, removeAddonFolder }
