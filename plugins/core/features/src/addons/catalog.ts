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

const RELEASES = 'https://github.com/vaakx-dev/sand/releases'
const CATALOG_TIMEOUT_MS = 20_000
const CATALOG_FRESH_MS = 60_000

const listing = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  label: z.string(),
  summary: z.string(),
  version: z.string(),
  sand: z.string(),
  needs: z.array(z.string()),
  file: z.string().min(1),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  hash: z.string().min(1),
  readme: z.string().default(''),
  pictures: z.array(z.string().regex(/^[\w.-]+$/)).default([]),
  cover: z.string().regex(/^[\w.-]+$/).optional(),
})

const catalogSchema = z.object({ addons: z.array(listing) })

const channelUrl = (channel: UpdateChannel) =>
  channel === 'release' ? `${RELEASES}/latest/download/${addonCatalogAsset}` : `${RELEASES}/download/${channel}/${addonCatalogAsset}`

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

const catalogCache = () => {
  const kept = new Map<string, { at: number; url: string; catalog: AddonCatalog }>()
  const fresh = async (source: Source): Promise<Shelf> => {
    const at = Date.now()
    const url = await source.url()
    try {
      const catalog = await fetchCatalog(url)
      kept.set(source.id, { at, url, catalog })
      return { source, url, catalog }
    } catch (error) {
      return { source, url, error: errorMessage(error) }
    }
  }
  const recent = async (source: Source): Promise<Shelf> => {
    const known = kept.get(source.id)
    return known && Date.now() - known.at < CATALOG_FRESH_MS ? { source, ...known } : fresh(source)
  }
  return { fresh, recent, forget: (id: string) => void kept.delete(id) }
}

export { catalogCache, channelUrl, fetchCatalog, type Shelf }
