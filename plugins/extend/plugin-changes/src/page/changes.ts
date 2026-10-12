import type { PluginChangeKind, PluginOffer } from '@sand/host-plugin-sync/contract'
import { badge, derive, div, hintRow, icon, itemRow, p, primaryAction, quietButton, rowList, secondaryAction, settingsRow, settingsSection, show, span, type Sig, type Tone } from '@sand/dom'
import { plural } from '@sand/kit'
import { groupOffers, offerSummary, type OfferGroup } from '../offers'
import type { PluginSource } from '../source'

const tags: Record<PluginChangeKind, Tone> = { changed: 'warning', new: 'accent', removed: 'neutral' }

const labels: Record<PluginChangeKind, string> = { changed: 'Changed', new: 'New', removed: 'Removed' }

const detail = (offer: PluginOffer) => {
  if (offer.kind === 'removed') return `deleted on ${offer.peerName}`
  const files = offer.kind === 'changed' ? `${plural(offer.files, 'file')} changed` : plural(offer.files, 'file')
  return `${files}${offer.both ? ' · also changed on this PC' : ''}`
}

const offerRow = (source: PluginSource, offer: Sig<PluginOffer>, busy: () => boolean) =>
  settingsRow(
    span(
      { class: 'flex min-w-0 items-center gap-2' },
      span({ class: 'truncate' }, () => offer.get().plugin),
      badge(tags[offer.get().kind], labels[offer.get().kind]),
    ),
    secondaryAction(
      {
        size: 'sm',
        disabled: busy,
        onClick: () => void source.apply(offer.get().peer, [offer.get().plugin]),
      },
      'Apply',
    ),
    () => detail(offer.get()),
  )

const groupSection = (source: PluginSource, group: Sig<OfferGroup>, busy: () => boolean) => {
  const names = () => group.get().offers.map(offer => offer.plugin)
  return settingsSection(
    {},
    itemRow(
      {},
      span({ class: 'inline-flex shrink-0 text-accent-400' }, icon('puzzle', 16)),
      () => offerSummary(group.get()),
      null,
      quietButton({ size: 'sm', disabled: busy, onClick: () => void source.skip(group.get().peer, names()) }, 'Skip'),
      primaryAction({ size: 'sm', disabled: busy, onClick: () => void source.apply(group.get().peer, names()) }, 'Apply all'),
    ),
    rowList(
      derive(() => group.get().offers),
      offer => `${offer.plugin}:${offer.kind}`,
      offer => offerRow(source, offer, busy),
    ),
  )
}

export const changesSection = (source: PluginSource) => {
  const busy = () => source.busy.get() !== undefined
  const groups = derive(() => groupOffers(source.state.get()?.offers ?? []))
  return div(
    { class: 'flex flex-col gap-3' },
    rowList(groups, group => group.peer, group => groupSection(source, group, busy)),
    show(
      () => Boolean(source.state.get()?.offers.length),
      () => p({ class: 'px-1 text-xs text-neutral-500' }, 'Applying restarts the runtime; running threads keep going.'),
    ),
    show(
      () => source.state.get()?.offers.length === 0,
      () => settingsSection({}, hintRow('Plugins match your other PCs')),
    ),
  )
}
