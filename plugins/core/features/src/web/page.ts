import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, span } from '@vaakx-dev/vrui'
import type { Addon, Feature, FeatureChoice } from '../contract'
import type { FeatureStore } from './store'

interface Placed {
  feature: Feature
  depth: number
}

const tree = (features: Feature[], feature: Feature, depth = 0): Placed[] => [
  { feature, depth },
  ...features.filter(child => child.parent === feature.id).flatMap(child => tree(features, child, depth + 1)),
]

const listed = (labels: string[]) => (labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}` : (labels[0] ?? ''))

const goesOffWith = (features: Feature[], id: string): Feature[] =>
  features.filter(other => other.on && (other.parent === id || other.needs.includes(id))).flatMap(other => [other, ...goesOffWith(features, other.id)])

const notice = (features: Feature[], feature: Feature) => {
  const off = goesOffWith(features, feature.id)
  const gone = new Set(off.map(other => other.id))
  const also = [...new Set(off.map(other => other.label))]
  const kept = feature.usedBy.some(id => !gone.has(id))
  return [also.length ? `Also turns off ${listed(also)}.` : '', kept ? (feature.stops ?? '') : ''].filter(Boolean).join(' ')
}

const available = (features: Feature[], id: string): boolean => {
  const found = features.find(feature => feature.id === id)
  if (!found) return false
  if (found.kind === 'feature') return found.on
  return found.chosen && found.needs.every(need => available(features, need))
}

const labelOf = ({ features, addons }: FeatureChoice, id: string) => features.find(feature => feature.id === id)?.label ?? addons.find(addon => addon.id === id)?.label ?? id

const missing = (features: Feature[], feature: Feature) => feature.needs.filter(need => !available(features, need))

const orphaned = (features: Feature[], feature: Feature) => feature.parent !== undefined && !available(features, feature.parent)

const blocked = (features: Feature[], feature: Feature) => orphaned(features, feature) || missing(features, feature).length > 0

const labels = (features: Feature[], ids: string[]) => ids.map(id => features.find(feature => feature.id === id)?.label ?? id)

const status = (choice: FeatureChoice, feature: Feature) => {
  const { features } = choice
  if (orphaned(features, feature)) return ''
  const needs = missing(features, feature)
  if (needs.length) return `Needs ${listed(needs.map(need => labelOf(choice, need)))}`
  if (feature.kind === 'feature' || !feature.chosen) return ''
  return feature.usedBy.length ? `Used by ${listed(labels(features, feature.usedBy))}` : 'Not used, so not loaded'
}

const detail = (summary: string, line: string) => (line ? [div(summary), div(line)] : summary)
const busy = (store: FeatureStore) => Boolean(store.applying.get())

const working = (kit: Kit, store: FeatureStore, id: string) => show(() => id in (store.applying.get() ?? {}), () => kit.spinner())

const featureSwitch = (kit: Kit, store: FeatureStore, { features }: FeatureChoice, feature: Feature) => {
  const { id, kind, label } = feature
  const on = kind === 'feature' ? feature.on : feature.chosen
  const warning = on ? notice(features, feature) : ''
  const apply = (next: boolean) => store.apply({ [id]: next })
  const turnOff = { id: 'off', label: 'Turn off', danger: true, confirm: warning, run: () => apply(false) }
  const flip = (event: MouseEvent) => {
    if (warning) return kit.confirm(event)(turnOff)
    void apply(!on)
  }
  return kit.toggleSwitch({ on, disabled: () => busy(store) || blocked(features, feature), 'aria-label': label, onClick: flip })
}

const row = (kit: Kit, store: FeatureStore, choice: FeatureChoice, { feature, depth }: Placed) =>
  kit.settingsRow(
    { title: feature.label, detail: detail(feature.summary, status(choice, feature)), lead: depth ? span({ class: 'w-0 shrink-0' }) : null },
    working(kit, store, feature.id),
    featureSwitch(kit, store, choice, feature),
  )

const removeButton = (kit: Kit, store: FeatureStore, { id, label }: Addon) => {
  const action = { id: 'remove', label: `Remove ${label}`, icon: 'trash', danger: true, confirm: `Deletes ${label} from this PC. You can install it again later.`, run: () => store.remove(id) }
  return kit.iconButton({ title: 'Remove', 'aria-label': `Remove ${label}`, disabled: () => busy(store), onClick: (event: MouseEvent) => kit.confirm(event)(action) }, kit.icon('trash'))
}

const installButton = (kit: Kit, store: FeatureStore, { id, label, needsSand }: Addon) =>
  kit.secondaryAction({ size: 'sm', 'aria-label': `Install ${label}`, disabled: () => busy(store) || Boolean(needsSand), onClick: () => void store.install(id) }, 'Install')

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

const addonRows = (kit: Kit, store: FeatureStore, choice: FeatureChoice, addon: Addon) => {
  const feature = choice.features.find(found => found.id === addon.id)
  const head = kit.settingsRow(
    { title: addon.label, detail: detail(addon.summary, addonLine(choice, addon, feature)) },
    working(kit, store, addon.id),
    ...addonControls(kit, store, choice, addon, feature),
  )
  const children = feature ? tree(choice.features, feature).slice(1).map(item => row(kit, store, choice, item)) : []
  return [head, ...children]
}

const catalogNote = ({ catalogError, addons }: FeatureChoice) => {
  if (!catalogError) return undefined
  return addons.length ? "Can't reach the add-on catalog, so only installed add-ons show. They keep working." : "Can't reach the add-on catalog. Try again when you're online."
}

export const featuresPage = (kit: Kit, store: FeatureStore) => {
  const { errorText, loadingState, settingsSection } = kit
  const state = derive(() => JSON.stringify(store.choice.get() ?? null))
  return div(
    { class: 'flex flex-col gap-6' },
    show(
      () => Boolean(store.error.get()),
      () => errorText(() => store.error.get()),
    ),
    dynamicChild(state, () => {
      const choice = store.choice.get()
      if (!choice) return loadingState()
      const { features, addons } = choice
      const addonIds = new Set(addons.map(addon => addon.id))
      const tops = features.filter(feature => feature.kind === 'feature' && !feature.parent && !addonIds.has(feature.id))
      return div(
        { class: 'contents' },
        settingsSection({ title: 'Add-ons', note: catalogNote(choice) }, addons.flatMap(addon => addonRows(kit, store, choice, addon))),
        settingsSection({ title: 'Core' }, tops.flatMap(top => tree(features, top)).map(item => row(kit, store, choice, item))),
        settingsSection(
          { title: 'Shared parts' },
          features.filter(feature => feature.kind === 'capability').map(feature => row(kit, store, choice, { feature, depth: 0 })),
        ),
      )
    }),
  )
}
