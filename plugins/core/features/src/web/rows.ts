import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span } from '@vaakx-dev/vrui'
import type { Feature, FeatureChoice } from '../contract'
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


export { busy, detail, featureSwitch, row, status, tree, working, type Placed }
