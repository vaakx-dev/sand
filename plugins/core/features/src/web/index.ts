import { wire } from '@sand/devices-contract'
import { place } from '@sand/ui-shell/contract'
import { owned } from '@sand/reactive'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { show } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { featureState, firstRun } from '../contract'
import { emptyHome } from './empty'
import { featuresPage } from './page'
import { questionView } from './question'
import { firstSteps, stepsView } from './steps'
import { featureStore } from './store'

export default definePlugin({
  name: 'features-web',
  description: 'The Features settings page, the first-run question of what sand is for, the first step of each feature picked, and the home screen while no feature fills it',
  inject: { wire, kit },
  apply(ctx) {
    const store = featureStore(ctx)
    const steps = owned(ctx, () => firstSteps(store))
    ctx.provide(firstRun, {
      stage: () => steps.stage.get(),
      step: steps.step,
      steps: () => steps.shown.get(),
      start: steps.start,
    })
    ctx.provide(featureState, { on: id => store.feature(id)?.on })
    ctx.watch(settings, found => found?.page({ id: 'features', label: 'Features', intro: 'Turn parts of sand on or off. Each works without the others.', icon: 'sliders', group: 'app', order: 15, render: () => featuresPage(ctx.kit, store) }))
    place(
      ctx,
      'overlay',
      () =>
        show(
          () => steps.stage.get() === 'question',
          () => ctx.kit.setupFrame(questionView(ctx.kit, store, steps)),
        ),
      0.5,
    )
    place(ctx, 'overlay', () => stepsView(ctx.kit, steps), 0.5)
    emptyHome(ctx, ctx.kit, store)
  },
})
