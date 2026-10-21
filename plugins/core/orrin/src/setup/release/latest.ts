import { archiveExtensions, hostTargets } from './targets'

interface ApiAsset {
  name: string
  browser_download_url: string
  size: number
}

interface ApiRelease {
  tag_name: string
  assets: ApiAsset[]
}

export interface ReleaseFile {
  name: string
  url: string
  size: number
}

export interface OrrinRelease {
  version: string
  archive?: ReleaseFile
  sums?: ReleaseFile
}

const apiTimeout = 20_000
const sumsName = 'SHA256SUMS'

const file = (asset: ApiAsset): ReleaseFile => ({ name: asset.name, url: asset.browser_download_url, size: asset.size })

const archiveFor = (assets: ApiAsset[], version: string) => {
  const names = hostTargets().flatMap(target => archiveExtensions.map(ext => `orrin-${version}-${target}${ext}`))
  for (const name of names) {
    const asset = assets.find(found => found.name === name)
    if (asset) return file(asset)
  }
}

export const fetchLatest = async (releases: string): Promise<OrrinRelease | undefined> => {
  const response = await fetch(`${releases}/latest`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'sand' },
    signal: AbortSignal.timeout(apiTimeout),
  })
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`Orrin's releases answered HTTP ${response.status}`)
  const release = (await response.json()) as ApiRelease
  const version = release.tag_name.replace(/^v/, '')
  const sums = release.assets.find(asset => asset.name === sumsName)
  return { version, archive: archiveFor(release.assets, version), sums: sums && file(sums) }
}
