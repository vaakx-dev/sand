import type { PluginOffer } from '@sand/host-plugin-sync/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { derive, div, show, type Sig } from '@vaakx-dev/vrui'
import { groupOffers, offerSummary, type OfferGroup } from './offers'
import type { SyncSource } from './source'

const detail = (offer: PluginOffer) => {
  if (offer.kind === 'removed') return `Deleted on ${offer.peerName}`
  const files = offer.kind === 'changed' ? `${plural(offer.files, 'file')} changed` : `New · ${plural(offer.files, 'file')}`
  return `${files}${offer.both ? ' · also changed on this PC' : ''}`
}

const offerRow = ({ quietButton, settingsRow }: Kit, source: SyncSource, offer: Sig<PluginOffer>, busy: () => boolean) =>
  settingsRow(
    { title: () => offer.get().plugin, detail: () => detail(offer.get()) },
    quietButton({ size: 'sm', surface: 'group', disabled: busy, onClick: () => void source.apply(offer.get().peer, [offer.get().plugin]) }, 'Apply'),
  )

const groupActions = ({ quietButton }: Kit, source: SyncSource, group: Sig<OfferGroup>, busy: () => boolean) => {
  const names = () => group.get().offers.map(offer => offer.plugin)
  return [
    quietButton({ size: 'sm', disabled: busy, onClick: () => void source.skip(group.get().peer, names()) }, 'Skip all'),
    quietButton({ size: 'sm', disabled: busy, onClick: () => void source.apply(group.get().peer, names()) }, 'Apply all'),
  ]
}

const groupSection = (kit: Kit, source: SyncSource, group: Sig<OfferGroup>, busy: () => boolean) => {
  const { rowList, settingsSection } = kit
  return settingsSection(
    { title: () => offerSummary(group.get()), action: groupActions(kit, source, group, busy) },
    rowList(
      derive(() => group.get().offers),
      offer => `${offer.plugin}:${offer.kind}`,
      offer => offerRow(kit, source, offer, busy),
    ),
  )
}

export const changesSection = (kit: Kit, source: SyncSource) => {
  const { pageHead, rowList } = kit
  const busy = () => source.busy.get() !== undefined
  const groups = derive(() => groupOffers(source.state.get()?.offers ?? []))
  return show(
    () => groups.get().length > 0,
    () =>
      div(
        { class: 'flex flex-col gap-6' },
        pageHead('Applying a change restarts the sand runtime. Running threads keep going.'),
        rowList(groups, group => group.peer, group => groupSection(kit, source, group, busy)),
      ),
  )
}
