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
}

interface AddonCatalog {
  addons: AddonListing[]
}

interface AddonStamp {
  id: string
  version: string
  hash: string
  sha256: string
}

const addonCatalogAsset = 'sand-addons.json'

const addonStampFile = 'sand-addon.json'

const addonAsset = (id: string) => `sand-addon-${id}.tar.gz`

export { addonAsset, addonCatalogAsset, addonStampFile, type AddonCatalog, type AddonListing, type AddonStamp }
