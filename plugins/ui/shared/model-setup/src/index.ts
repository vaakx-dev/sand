import type {} from '@sand/composer-card/contract'
import type {} from '@sand/server/contract'
import { place, pulse } from '@sand/kit/web'
import { definePlugin } from 'drydock'
import { modelSetup } from './setup'
import { setupView } from './view/view'

export default definePlugin({
  name: 'model-setup',
  description: 'After the first sign-in, pick the model for new threads and the model that names threads',
  inject: ['kit', 'models', 'wire'],
  uses: {
    layout: 'the setup lands loose on the stage',
    threads: 'the default is saved without the current folder',
    composer: 'Start a thread does not focus the composer',
  },
  apply(ctx) {
    const setup = modelSetup(ctx)
    const changes = pulse(ctx, ['models.change'], ['models'])
    ctx.provide('modelSetup', { start: () => void setup.start() })
    place(ctx, 'main', () => setupView(ctx.kit, setup, ctx.models, changes), 0.5)
  },
})
