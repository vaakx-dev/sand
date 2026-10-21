import type { PluginOffer } from '@sand/host-plugin-sync/contract'
import { plural } from '@sand/util'

export interface OfferGroup {
  peer: string
  peerName: string
  offers: PluginOffer[]
}

export const groupOffers = (offers: PluginOffer[]) => {
  const groups = new Map<string, OfferGroup>()
  for (const offer of offers) {
    const group = groups.get(offer.peer) ?? { peer: offer.peer, peerName: offer.peerName, offers: [] }
    group.offers.push(offer)
    groups.set(offer.peer, group)
  }
  return [...groups.values()]
}

export const offerSummary = (group: OfferGroup) => `${plural(group.offers.length, 'plugin change')} from ${group.peerName}`
