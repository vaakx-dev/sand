import { modelSetup } from '@sand/accounts/contract'
import { place } from '@sand/layout/place'
import { kit } from '@sand/ui-kit/contract'
import { models, modelsChange, wire } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import { definePlugin } from 'drydock'
import { setupState } from './setup'
import { setupView } from './view/view'

export default definePlugin({
  name: 'model-setup',
  description: 'After the first sign-in, pick the default model',
  inject: { kit, models, wire },
  apply(ctx) {
    const setup = setupState(ctx)
    const changes = pulse(ctx, [modelsChange], [models])
    ctx.provide(modelSetup, { start: setup.start })
    place(ctx, 'main', () => setupView(ctx.kit, setup, ctx.models, changes), 0.5)
  },
})
