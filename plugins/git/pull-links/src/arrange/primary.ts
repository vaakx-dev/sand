import type { PullLink } from '../contract'
import { type Chain, fromTop } from './chains'

export const isOpen = ({ summary }: PullLink) => !summary || summary.state === 'open' || summary.state === 'draft'

export const touched = (link: PullLink) => link.summary?.updated ?? link.linked

const newestLinked = (links: PullLink[]) => Math.max(...links.map(link => link.linked))

const newest = (links: PullLink[]) => links.reduce((best, link) => (touched(link) > touched(best) ? link : best))

export const primaryOf = (links: PullLink[], chains: Chain[]): PullLink | undefined => {
  if (!links.length) return undefined
  const open = links.filter(isOpen)
  if (open.length === 1) return open[0]
  if (open.length > 1) {
    const openChains = chains.map(chain => fromTop(chain).filter(isOpen)).filter(layers => layers.length)
    return openChains.sort((a, b) => newestLinked(b) - newestLinked(a))[0]?.[0]
  }
  const [only] = chains
  if (chains.length === 1 && only) return fromTop(only)[0]
  return newest(links)
}
