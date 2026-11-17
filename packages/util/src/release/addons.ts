import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { readStamp } from './stamp'

interface AddonListing {
  id: string
  label: string
  summary: string
  version: string
  sand: string
  needs: string[]
  parent?: string
  file: string
  size: number
  sha256: string
  hash: string
  readme: string
  pictures: string[]
  cover?: string
}

interface AddonCatalog {
  addons: AddonListing[]
}

interface AddonStamp {
  id: string
  source: string
  version: string
  hash: string
  sha256: string
}

const fault = z.object({ build: z.string(), error: z.string(), at: z.number() })

type AddonFault = z.infer<typeof fault>

const SOURCE_BUILD = 'source'

const addonCatalogAsset = 'sand-addons.json'

const addonStampFile = 'sand-addon.json'

const addonFaultFile = 'sand-addon-fault.json'

const addonAsset = (id: string) => `sand-addon-${id}.tar.gz`

const addonPicture = (id: string, file: string) => `sand-addon-${id}-${file}`

const isAddonFolder = (dir: string) => Bun.file(join(dir, addonStampFile)).exists()

const coreBuild = async (builtins: string) => (await readStamp(join(builtins, '..')))?.id ?? SOURCE_BUILD

const addonFault = async (dir: string) =>
  fault.safeParse(
    await Bun.file(join(dir, addonFaultFile))
      .json()
      .catch(() => undefined),
  ).data

const recordAddonFault = (dir: string, fault: AddonFault) => Bun.write(join(dir, addonFaultFile), `${JSON.stringify(fault, null, 2)}\n`)

const clearAddonFault = (dir: string) => rm(join(dir, addonFaultFile), { force: true })

const installedAddons = async (root: string) => {
  const folders = (await readdir(root, { withFileTypes: true }).catch(() => []))
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => join(root, entry.name))
  const addons = await Promise.all(folders.map(isAddonFolder))
  return folders.filter((_, index) => addons[index])
}

const addonFolders = async (root: string, build: string) => {
  const folders = await installedAddons(root)
  const faults = await Promise.all(folders.map(addonFault))
  return folders.filter((_, index) => faults[index]?.build !== build)
}

export {
  addonAsset,
  addonCatalogAsset,
  addonFault,
  addonFaultFile,
  addonFolders,
  addonPicture,
  addonStampFile,
  clearAddonFault,
  coreBuild,
  installedAddons,
  isAddonFolder,
  recordAddonFault,
  type AddonCatalog,
  type AddonFault,
  type AddonListing,
  type AddonStamp,
}
