import { wire } from '@sand/devices-contract'
import { markdown } from '@sand/markdown/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { featureState } from '../contract'
import { addonPages } from './addon/pages'
import { corePage } from './core'
import { CORE, emptyHome } from './empty'
import { availableItem, coreItem, featuresPage } from './page'
import { sourcesItem } from './sources'
import { featureStore } from './store'

export default definePlugin({
  name: 'features-web',
  description: "The Add-ons settings page, where add-ons are browsed, installed, updated and removed and features turned on, each add-on's own page, and the home screen while no feature fills it",
  inject: { wire, kit },
  apply(ctx) {
    const store = featureStore(ctx)
    ctx.provide(featureState, { on: id => store.feature(id)?.on })
    ctx.watch(settings, found => {
      if (!found) return
      const addons = addonPages(found, { kit: ctx.kit, store, markdown: () => ctx.get(markdown) })
      const links = { ...addons, core: () => found.open(CORE) }
      const core = found.page({ id: CORE, label: 'Core features', parent: 'features', group: 'app', render: () => corePage(ctx.kit, store) })
      const list = found.page({
        id: 'features',
        label: 'Add-ons',
        icon: 'sliders',
        group: 'app',
        order: 15,
        items: [availableItem, sourcesItem, coreItem],
        render: () => featuresPage(ctx.kit, store, links),
      })
      return () => {
        addons.dispose()
        void core()
        void list()
      }
    })
    emptyHome(ctx, ctx.kit, store)
  },
})
