import { modelSetup } from '@sand/accounts/contract'
import { wire } from '@sand/devices-contract'
import { place } from '@sand/ui-shell/contract'
import { kit } from '@sand/ui-kit/contract'
import { modelPicker } from '@sand/model-picker/contract'
import { models } from '@sand/web-client/contract'
import { owned } from '@sand/reactive'
import { definePlugin } from 'drydock'
import { setupState } from './setup'
import { setupView } from './view/view'

export default definePlugin({
  name: 'model-setup',
  description: 'After the first sign-in, pick the default model',
  inject: { kit, models, modelPicker, wire },
  apply(ctx) {
    const setup = owned(ctx, () => setupState(ctx))
    ctx.provide(modelSetup, { start: setup.start })
    place(ctx, 'overlay', () => setupView(ctx.kit, setup, ctx.models, ctx.modelPicker), 0.5)
  },
})
