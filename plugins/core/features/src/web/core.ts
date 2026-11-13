import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import { row, tree } from './rows'
import type { FeatureStore } from './store'

const corePage = (kit: Kit, store: FeatureStore) => {
  const state = derive(() => JSON.stringify(store.choice.get() ?? null))
  return div(
    { class: 'flex flex-col gap-6' },
    dynamicChild(state, () => {
      const choice = store.choice.get()
      if (!choice) return kit.loadingState()
      const { features, addons } = choice
      const addonIds = new Set(addons.map(addon => addon.id))
      const tops = features.filter(feature => feature.kind === 'feature' && !feature.parent && !addonIds.has(feature.id))
      return div(
        { class: 'contents' },
        kit.settingsSection({ title: 'Core' }, ...tops.flatMap(top => tree(features, top)).map(item => row(kit, store, choice, item))),
        kit.settingsSection(
          { title: 'Shared parts' },
          ...features.filter(feature => feature.kind === 'capability').map(feature => row(kit, store, choice, { feature, depth: 0 })),
        ),
      )
    }),
  )
}

export { corePage }
