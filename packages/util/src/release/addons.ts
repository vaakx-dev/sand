import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

interface AddonListing {
  id: string
  label: string
  summary: string
  version: string
  sand: string
  needs: string[]
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

const addonCatalogAsset = 'sand-addons.json'

const addonStampFile = 'sand-addon.json'

const addonAsset = (id: string) => `sand-addon-${id}.tar.gz`

const addonPicture = (id: string, file: string) => `sand-addon-${id}-${file}`

const isAddonFolder = (dir: string) => Bun.file(join(dir, addonStampFile)).exists()

const addonFolders = async (root: string) => {
  const folders = (await readdir(root, { withFileTypes: true }).catch(() => []))
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => join(root, entry.name))
  const addons = await Promise.all(folders.map(isAddonFolder))
  return folders.filter((_, index) => addons[index])
}

export { addonAsset, addonCatalogAsset, addonPicture, addonFolders, addonStampFile, isAddonFolder, type AddonCatalog, type AddonListing, type AddonStamp }
