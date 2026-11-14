import { botRoute } from '@sand/bots/contract'
import { threadRoute } from '@sand/chat/contract'
import { visitsOf, type PaletteItem } from '@sand/palette/contract'
import type { Route } from '@sand/ui-shell/contract'
import { ago, DAY_MS } from '@sand/util'
import { fits, type MessageHit } from '../contract'
import type { PcHit } from './search'

export interface RowParts {
  used(visits: string): number
  tint(bot: string): string | undefined
  open(hit: PcHit): void
}

const RECENT_HALF_LIFE_MS = 14 * DAY_MS

const routeOf = ({ owner, chat }: MessageHit): Route => ({ kind: owner === 'bot' ? botRoute : threadRoute, id: chat })

const recency = ({ at }: MessageHit) => 0.5 ** (Math.max(0, Date.now() - at) / RECENT_HALF_LIFE_MS)

const fitOrder = ({ fit }: MessageHit) => fits.indexOf(fit)

const lead = (parts: RowParts, hit: MessageHit): Pick<PaletteItem, 'face' | 'icon'> => {
  const tint = hit.owner === 'bot' ? parts.tint(hit.chat) : undefined
  return tint ? { face: { id: hit.chat, tint } } : { icon: 'message' }
}

const item = (parts: RowParts, hit: PcHit): PaletteItem => ({
  id: `message:${hit.pc}:${hit.owner}:${hit.entry}:${hit.block}`,
  label: hit.title,
  excerpt: hit.excerpt,
  meta: ago(hit.at),
  visits: visitsOf(routeOf(hit)),
  ...lead(parts, hit),
  run: () => parts.open(hit),
})

const messageRows = (parts: RowParts, hits: PcHit[]) =>
  hits
    .map(hit => ({ hit, weight: recency(hit) + parts.used(visitsOf(routeOf(hit))) }))
    .toSorted((a, b) => fitOrder(a.hit) - fitOrder(b.hit) || b.weight - a.weight)
    .map(({ hit }) => item(parts, hit))

export { messageRows }
