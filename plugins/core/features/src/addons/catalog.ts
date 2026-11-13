import type { UpdateChannel } from '@sand/host-updates/contract'
import { errorMessage } from '@sand/util'
import { type AddonCatalog, addonCatalogAsset } from '@sand/util/release'
import { z } from 'zod'

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
})

const catalogSchema = z.object({ addons: z.array(listing) })

const channelUrl = (channel: UpdateChannel) =>
  channel === 'release' ? `${RELEASES}/latest/download/${addonCatalogAsset}` : `${RELEASES}/download/${channel}/${addonCatalogAsset}`

const fetchCatalog = async (url: string): Promise<AddonCatalog> => {
  const response = await fetch(url, { headers: { 'user-agent': 'sand' }, signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) }).catch((error: unknown) => {
    throw new Error(`Couldn't reach the add-on catalog: ${errorMessage(error)}`)
  })
  if (response.status === 404) throw new Error('There is no add-on catalog for this sand yet')
  if (!response.ok) throw new Error(`The add-on catalog answered HTTP ${response.status}`)
  const parsed = catalogSchema.safeParse(await response.json().catch(() => undefined))
  if (!parsed.success) throw new Error("The add-on catalog isn't one sand can read")
  return parsed.data
}

const catalogSource = (url: () => Promise<string>) => {
  let kept: { at: number; url: string; catalog: AddonCatalog } | undefined
  const fresh = async () => {
    const at = Date.now()
    const where = await url()
    kept = { at, url: where, catalog: await fetchCatalog(where) }
    return kept
  }
  const recent = async () => (kept && Date.now() - kept.at < CATALOG_FRESH_MS ? kept : fresh())
  return { fresh, recent }
}

export { catalogSource, channelUrl }
