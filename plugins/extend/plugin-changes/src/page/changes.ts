import type { PluginChangeKind, PluginOffer } from '@sand/host-plugin-sync/contract'
import { badge, derive, div, icon, p, primaryAction, quietButton, secondaryAction, settingsRow, settingsSection, show, span, type Sig, type Tone } from '@sand/dom'
import { groupOffers, offerSummary, type OfferGroup } from '../offers'
import { plural } from '../plural'
import { noteRow, rows } from '../rows'
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
    div(
      { class: 'flex min-h-12 flex-wrap items-center gap-3 bg-neutral-900 px-4 py-2' },
      span({ class: 'shrink-0 text-accent-400' }, icon('puzzle', 15)),
      span({ class: 'min-w-0 flex-1 text-sm text-neutral-100' }, () => offerSummary(group.get())),
      quietButton({ size: 'sm', disabled: busy, onClick: () => void source.skip(group.get().peer, names()) }, 'Skip'),
      primaryAction({ size: 'sm', disabled: busy, onClick: () => void source.apply(group.get().peer, names()) }, 'Apply all'),
    ),
    rows(
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
    rows(groups, group => group.peer, group => groupSection(source, group, busy)),
    show(
      () => Boolean(source.state.get()?.offers.length),
      () => p({ class: 'px-1 text-xs text-neutral-500' }, 'Applying restarts the runtime; running threads keep going.'),
    ),
    show(
      () => source.state.get()?.offers.length === 0,
      () => settingsSection({}, noteRow('Plugins match your other PCs.')),
    ),
  )
}
