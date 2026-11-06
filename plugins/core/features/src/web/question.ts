import type { Kit } from '@sand/ui-kit/contract'
import { show, sig } from '@vaakx-dev/vrui'
import type { Feature } from '../contract'
import type { FirstSteps } from './steps'
import type { FeatureStore } from './store'

const choiceRow = ({ settingsRow, toggleSwitch }: Kit, store: FeatureStore, feature: Feature, picked: () => boolean, toggle: () => void) =>
  settingsRow(
    { title: feature.label, detail: feature.summary },
    toggleSwitch({ on: picked, disabled: () => Boolean(store.applying.get()), 'aria-label': feature.label, onClick: toggle }),
  )

export const questionView = (kit: Kit, store: FeatureStore, steps: FirstSteps) => {
  const { errorText, primaryAction, settingsSection, setupColumn, setupHeading, setupNote, setupScreen } = kit
  const picked = sig<ReadonlySet<string>>(new Set())
  const offered = store.choice.get()?.features.filter(feature => feature.offer) ?? []
  const toggle = (id: string) =>
    picked.update(set => {
      const next = new Set(set)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const apply = () => {
    steps.begin()
    void store.apply(Object.fromEntries(offered.map(feature => [feature.id, picked.get().has(feature.id)])))
  }
  return setupScreen(
    setupHeading('What do you want sand for?'),
    setupNote('Pick any. You can change it later in Settings.'),
    setupColumn(
      settingsSection(
        {},
        offered.map(feature =>
          choiceRow(
            kit,
            store,
            feature,
            () => picked.get().has(feature.id),
            () => toggle(feature.id),
          ),
        ),
      ),
      show(
        () => Boolean(store.error.get()),
        () => errorText(() => store.error.get()),
      ),
    ),
    primaryAction({ disabled: () => !picked.get().size || Boolean(store.applying.get()), onClick: apply }, () => (store.applying.get() ? 'Setting up sand…' : 'Continue')),
  )
}
