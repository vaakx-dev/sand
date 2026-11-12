import { wire } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { featureState } from '../contract'
import { emptyHome } from './empty'
import { featuresPage } from './page'
import { featureStore } from './store'

export default definePlugin({
  name: 'features-web',
  description: 'The Features settings page, and the home screen while no feature fills it',
  inject: { wire, kit },
  apply(ctx) {
    const store = featureStore(ctx)
    ctx.provide(featureState, { on: id => store.feature(id)?.on })
    ctx.watch(settings, found => found?.page({ id: 'features', label: 'Features', intro: 'Turn parts of sand on or off. Each works without the others.', icon: 'sliders', group: 'app', order: 15, render: () => featuresPage(ctx.kit, store) }))
    emptyHome(ctx, ctx.kit, store)
  },
})
