import type { PluginOffer } from '@sand/protocol'
import { effect, owned, untrack } from '@sand/dom'
import type { Context } from 'drydock'
import type { PluginSource } from './source'

const keyOf = (offer: PluginOffer) => `${offer.peer}:${offer.plugin}:${offer.hash}`

const byPeer = (offers: PluginOffer[]) => {
  const groups = new Map<string, PluginOffer[]>()
  for (const offer of offers) groups.set(offer.peer, [...(groups.get(offer.peer) ?? []), offer])
  return groups
}

export const offerNotice = (ctx: Context, source: PluginSource) => {
  const seen = new Set<string>()
  let first = true

  const announce = (offers: PluginOffer[]) => {
    const fresh = offers.filter(offer => !seen.has(keyOf(offer)))
    for (const offer of fresh) seen.add(keyOf(offer))
    if (first) {
      first = false
      if (ctx.settings?.current() === 'plugins') return
    }
    const all = byPeer(offers)
    for (const [peer, group] of byPeer(fresh)) {
      const n = all.get(peer)?.length ?? group.length
      ctx.notify?.push(`${n} plugin change${n === 1 ? '' : 's'} from ${group[0]!.peerName}`, {
        action: { label: 'Review', run: () => ctx.settings?.open('plugins') },
      })
    }
  }

  owned(ctx, () =>
    effect(() => {
      const state = source.state.get()
      if (state) untrack(() => announce(state.offers))
    }),
  )
}
