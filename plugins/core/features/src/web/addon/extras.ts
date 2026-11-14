import type { Kit } from '@sand/ui-kit/contract'
import { div, media, span } from '@vaakx-dev/vrui'
import type { Addon, FeatureChoice } from '../../contract'
import { busy, featureSwitch, working } from '../rows'
import { updateButton } from './controls'
import type { FeatureStore } from '../store'

const extrasOf = ({ addons }: FeatureChoice, id: string) => addons.filter(addon => addon.parent === id)

const isExtra = ({ addons }: FeatureChoice, addon: Addon) => addons.some(other => other.id === addon.parent)

const hostsOf = (choice: FeatureChoice, addons: Addon[]) => [...new Set(addons.map(addon => choice.addons.find(other => other.id === addon.parent) ?? addon))]

const extrasLine = (choice: FeatureChoice, id: string) => {
  const extras = extrasOf(choice, id)
  if (!extras.length) return ''
  const on = extras.filter(extra => choice.features.find(feature => feature.id === extra.id)?.on).length
  return `${on} of ${extras.length} extras on`
}

const getButton = (kit: Kit, store: FeatureStore, { id, label, needsSand }: Addon) =>
  kit.secondaryAction({ size: 'sm', 'aria-label': `Get ${label}`, disabled: () => busy(store) || Boolean(needsSand), onClick: () => void store.install(id) }, 'Get')

const extraControls = (kit: Kit, store: FeatureStore, choice: FeatureChoice, extra: Addon) => {
  if (extra.status === 'available') return [getButton(kit, store, extra)]
  const feature = choice.features.find(found => found.id === extra.id)
  return [updateButton(kit, store, extra), feature ? featureSwitch(kit, store, choice, feature) : null]
}

const extraTile = (kit: Kit, store: FeatureStore, choice: FeatureChoice, extra: Addon) =>
  div(
    { class: 'flex min-w-0 items-center gap-3 rounded-xl bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800' },
    div({ class: 'flex min-w-0 flex-1 flex-col' }, kit.rowName(extra.label), span({ class: 'truncate text-xs text-neutral-500', title: extra.summary }, extra.summary)),
    working(kit, store, extra.id),
    ...extraControls(kit, store, choice, extra),
  )

const extrasSection = (kit: Kit, store: FeatureStore, choice: FeatureChoice, addon: Addon) => {
  const extras = extrasOf(choice, addon.id)
  if (!extras.length) return null
  const wide = media('(min-width: 640px)')
  return kit.settingsSection(
    { title: 'Extras', note: `Small add-ons for ${addon.label}. Each one turns on and off on its own.` },
    div({ class: () => ['grid gap-2', wide.get() ? 'grid-cols-2' : 'grid-cols-1'] }, ...extras.map(extra => extraTile(kit, store, choice, extra))),
  )
}

export { extrasLine, extrasOf, extrasSection, hostsOf, isExtra }
