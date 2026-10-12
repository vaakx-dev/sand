import type { PluginOffer } from '@sand/host-plugin-sync/contract'
import { owned } from '@sand/kit/web'
import { effect, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { groupOffers, offerSummary } from './offers'
import { page } from './shown'
import type { PluginSource } from './source'

const keyOf = (offer: PluginOffer) => `${offer.peer}:${offer.plugin}:${offer.hash}`

export const offerNotice = (ctx: Context, source: PluginSource) => {
  const seen = new Set<string>()
  let first = true

  const announce = (offers: PluginOffer[]) => {
    const fresh = new Set(offers.filter(offer => !seen.has(keyOf(offer))))
    for (const offer of fresh) seen.add(keyOf(offer))
    if (first) {
      first = false
      if (ctx.settings?.current() === page) return
    }
    for (const group of groupOffers(offers)) {
      if (!group.offers.some(offer => fresh.has(offer))) continue
      ctx.notify?.push(offerSummary(group), { action: { label: 'Review', run: () => ctx.settings?.open(page) } })
    }
  }

  owned(ctx, () =>
    effect(() => {
      const state = source.state.get()
      if (state) untrack(() => announce(state.offers))
    }),
  )
}
