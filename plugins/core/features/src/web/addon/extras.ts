import type { Kit } from '@sand/ui-kit/contract'
import type { Addon, Feature, FeatureChoice } from '../../contract'
import { busy, working } from '../rows'
import { addonControls, addonLine } from './controls'
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

const extraControls = (kit: Kit, store: FeatureStore, choice: FeatureChoice, extra: Addon, feature: Feature | undefined) =>
  extra.status === 'available' ? [getButton(kit, store, extra)] : addonControls(kit, store, choice, extra, feature)

const extraRow = (kit: Kit, store: FeatureStore, choice: FeatureChoice, extra: Addon) => {
  const feature = choice.features.find(found => found.id === extra.id)
  return kit.settingsRow(
    { title: extra.label, detail: addonLine(choice, extra, feature) },
    working(kit, store, extra.id),
    ...extraControls(kit, store, choice, extra, feature),
  )
}

const extrasSection = (kit: Kit, store: FeatureStore, choice: FeatureChoice, addon: Addon) => {
  const extras = extrasOf(choice, addon.id)
  if (!extras.length) return null
  return kit.settingsSection(
    { title: 'Extras' },
    ...extras.map(extra => extraRow(kit, store, choice, extra)),
  )
}

export { extrasLine, extrasOf, extrasSection, hostsOf, isExtra }
