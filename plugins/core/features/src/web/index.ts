import { wire } from '@sand/devices-contract'
import { markdown } from '@sand/markdown/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { featureState } from '../contract'
import { addonPages } from './addon/pages'
import { emptyHome } from './empty'
import { featuresPage } from './page'
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
      const links = addonPages(found, { kit: ctx.kit, store, markdown: () => ctx.get(markdown) })
      const list = found.page({
        id: 'features',
        label: 'Add-ons',
        intro: 'Install what else you want sand to do. Your bots can install add-ons for you too.',
        icon: 'sliders',
        group: 'app',
        order: 15,
        render: () => featuresPage(ctx.kit, store, links),
      })
      return () => {
        links.dispose()
        void list()
      }
    })
    emptyHome(ctx, ctx.kit, store)
  },
})
