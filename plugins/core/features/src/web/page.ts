import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { Feature } from '../contract'
import type { FeatureStore } from './store'

interface Placed {
  feature: Feature
  depth: number
}

const indents = ['', 'w-0', 'w-5', 'w-10']

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
  if (!found) return true
  if (found.kind === 'feature') return found.on
  return found.chosen && found.needs.every(need => available(features, need))
}

const missing = (features: Feature[], feature: Feature) =>
  feature.needs.filter(need => !available(features, need)).map(need => features.find(other => other.id === need)?.label ?? need)

const orphaned = (features: Feature[], feature: Feature) => feature.parent !== undefined && !available(features, feature.parent)

const blocked = (features: Feature[], feature: Feature) => orphaned(features, feature) || missing(features, feature).length > 0

const labels = (features: Feature[], ids: string[]) => ids.map(id => features.find(feature => feature.id === id)?.label ?? id)

const status = (features: Feature[], feature: Feature) => {
  if (orphaned(features, feature)) return ''
  const needs = missing(features, feature)
  if (needs.length) return `Needs ${listed(needs)}`
  if (feature.kind === 'feature' || !feature.chosen) return ''
  return feature.usedBy.length ? `Used by ${listed(labels(features, feature.usedBy))}` : 'Not used, so not loaded'
}

const detail = (summary: string, line: string) => (line ? [div(summary), div({ class: 'text-neutral-500' }, line)] : summary)

const row = (kit: Kit, store: FeatureStore, confirming: Sig<string | undefined>, features: Feature[], { feature, depth }: Placed) => {
  const { actionTones, controlButton, quietButton, rowWarning, settingsRow, spinner, toggleSwitch } = kit
  const { id, kind, label, summary } = feature
  const on = kind === 'feature' ? feature.on : feature.chosen
  const warning = on ? notice(features, feature) : ''
  const apply = (next: boolean) => {
    confirming.set(undefined)
    void store.apply({ [id]: next })
  }
  const flip = () => (warning ? confirming.set(id) : apply(!on))
  return div(
    { class: 'contents' },
    settingsRow(
      { title: label, detail: detail(summary, status(features, feature)), lead: depth ? span({ class: ['shrink-0', indents[depth]] }) : null },
      show(() => id in (store.applying.get() ?? {}), () => spinner()),
      toggleSwitch({ on, disabled: () => Boolean(store.applying.get()) || blocked(features, feature), 'aria-label': label, onClick: flip }),
    ),
    show(
      () => confirming.get() === id,
      () =>
        rowWarning(
          warning,
          quietButton({ size: 'sm', onClick: () => confirming.set(undefined) }, 'Cancel'),
          controlButton(actionTones.danger, { size: 'sm', onClick: () => apply(false) }, 'Turn off'),
        ),
    ),
  )
}

export const featuresPage = (kit: Kit, store: FeatureStore) => {
  const { errorText, loadingState, settingsSection } = kit
  const confirming = sig<string | undefined>(undefined)
  const state = derive(() => JSON.stringify(store.choice.get()?.features ?? null))
  return div(
    { class: 'flex flex-col gap-6' },
    show(
      () => Boolean(store.error.get()),
      () => errorText(() => store.error.get()),
    ),
    dynamicChild(state, () => {
      const features = store.choice.get()?.features
      if (!features) return loadingState()
      const tops = features.filter(feature => feature.kind === 'feature' && !feature.parent)
      return div(
        { class: 'contents' },
        tops.map(top => settingsSection({}, tree(features, top).map(item => row(kit, store, confirming, features, item)))),
        settingsSection(
          { title: 'Shared parts' },
          features.filter(feature => feature.kind === 'capability').map(feature => row(kit, store, confirming, features, { feature, depth: 0 })),
        ),
      )
    }),
  )
}
