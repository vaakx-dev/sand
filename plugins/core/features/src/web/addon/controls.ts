import type { Kit } from '@sand/ui-kit/contract'
import type { Addon, Feature, FeatureChoice } from '../../contract'
import { busy, featureSwitch, status } from '../rows'
import type { FeatureStore } from '../store'

const removeButton = (kit: Kit, store: FeatureStore, { id, label }: Addon) => {
  const action = { id: 'remove', label: `Remove ${label}`, icon: 'trash', danger: true, confirm: `Deletes ${label} from this PC. You can install it again later.`, run: () => store.remove(id) }
  return kit.iconButton({ title: 'Remove', 'aria-label': `Remove ${label}`, disabled: () => busy(store), onClick: (event: MouseEvent) => kit.confirm(event)(action) }, kit.icon('trash'))
}

const installButton = (kit: Kit, store: FeatureStore, { id, label, needsSand }: Addon) =>
  kit.primaryAction({ 'aria-label': `Install ${label}`, disabled: () => busy(store) || Boolean(needsSand), onClick: () => void store.install(id) }, 'Install')

const updateButton = (kit: Kit, store: FeatureStore, { id, label, update }: Addon) =>
  update ? kit.secondaryAction({ size: 'sm', title: `Update to ${update}`, 'aria-label': `Update ${label}`, disabled: () => busy(store), onClick: () => void store.update(id) }, 'Update') : null

const addonControls = (kit: Kit, store: FeatureStore, choice: FeatureChoice, addon: Addon, feature: Feature | undefined) => {
  const toggle = feature ? featureSwitch(kit, store, choice, feature) : null
  switch (addon.status) {
    case 'available':
      return [installButton(kit, store, addon)]
    case 'installed':
      return [updateButton(kit, store, addon), toggle, removeButton(kit, store, addon)]
    case 'built-in':
      return [toggle]
  }
}

const addonLine = (choice: FeatureChoice, addon: Addon, feature: Feature | undefined) => {
  if (addon.needsSand) return 'Needs a newer sand'
  return feature ? status(choice, feature) : ''
}

export { addonControls, addonLine }
