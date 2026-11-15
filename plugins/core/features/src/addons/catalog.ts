import type { UpdateChannel } from '@sand/host-updates/contract'
import { errorMessage } from '@sand/util'
import { type AddonCatalog, addonCatalogAsset } from '@sand/util/release'
import { z } from 'zod'
import type { Source } from './sources'

interface Shelf {
  source: Source
  url?: string
  catalog?: AddonCatalog
  error?: string
}

interface Found {
  url: string
  catalog: AddonCatalog
}

interface BuildCatalog {
  hashes?: Record<string, string>
  channel: UpdateChannel
  version: string
  override?: string
}

const RELEASES = 'https://github.com/vaakx-dev/sand/releases'
const CATALOG_TIMEOUT_MS = 20_000
const CATALOG_FRESH_MS = 60_000
const GONE = "This sand build's add-ons are no longer on GitHub; update sand to get add-ons that fit it"

const listing = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  label: z.string(),
  summary: z.string(),
  version: z.string(),
  sand: z.string(),
  needs: z.array(z.string()),
  parent: z.string().optional(),
  file: z.string().min(1),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  hash: z.string().min(1),
  readme: z.string().default(''),
  pictures: z.array(z.string().regex(/^[\w.-]+$/)).default([]),
  cover: z.string().regex(/^[\w.-]+$/).optional(),
})

const catalogSchema = z.object({ addons: z.array(listing) })

const tagUrl = (tag: string) => `${RELEASES}/download/${tag}/${addonCatalogAsset}`

const channelUrl = (channel: UpdateChannel) => (channel === 'release' ? `${RELEASES}/latest/download/${addonCatalogAsset}` : tagUrl(channel))

const fetchCatalog = async (url: string): Promise<AddonCatalog> => {
  const response = await fetch(url, { headers: { 'user-agent': 'sand' }, signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) }).catch((error: unknown) => {
    throw new Error(`Couldn't reach it: ${errorMessage(error)}`)
  })
  if (response.status === 404) throw new Error('It has no add-on catalog yet')
  if (!response.ok) throw new Error(`It answered HTTP ${response.status}`)
  const parsed = catalogSchema.safeParse(await response.json().catch(() => undefined))
  if (!parsed.success) throw new Error("Its add-on catalog isn't one sand can read")
  return parsed.data
}

const fetchShelf = async (url: string): Promise<Found> => ({ url, catalog: await fetchCatalog(url) })

const fitting = (catalog: AddonCatalog, hashes: Record<string, string>): AddonCatalog => ({ addons: catalog.addons.filter(found => hashes[found.id] === found.hash) })

const candidates = ({ hashes, channel, version, override }: BuildCatalog) => {
  if (override) return [override]
  if (!hashes) return [channelUrl(channel)]
  const own = tagUrl(`v${version}`)
  return channel === 'release' ? [own] : [tagUrl(channel), own]
}

const buildShelf = async (build: BuildCatalog): Promise<Found> => {
  const { hashes } = build
  if (!hashes) return fetchShelf(candidates(build)[0]!)
  for (const url of candidates(build)) {
    const found = await fetchCatalog(url).catch(() => undefined)
    const catalog = found && fitting(found, hashes)
    if (catalog?.addons.length) return { url, catalog }
  }
  throw new Error(GONE)
}

const catalogCache = () => {
  const kept = new Map<string, { at: number; url: string; catalog: AddonCatalog }>()
  const fresh = async (source: Source): Promise<Shelf> => {
    const at = Date.now()
    try {
      const { url, catalog } = await source.shelf()
      kept.set(source.id, { at, url, catalog })
      return { source, url, catalog }
    } catch (error) {
      return { source, error: errorMessage(error) }
    }
  }
  const recent = async (source: Source): Promise<Shelf> => {
    const known = kept.get(source.id)
    return known && Date.now() - known.at < CATALOG_FRESH_MS ? { source, ...known } : fresh(source)
  }
  return { fresh, recent, forget: (id: string) => void kept.delete(id) }
}

export { buildShelf, catalogCache, fetchShelf, fitting, type BuildCatalog, type Found, type Shelf }
