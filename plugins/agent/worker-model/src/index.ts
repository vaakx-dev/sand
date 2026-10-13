import type {} from '@sand/paths/contract'
import type {} from '@sand/server/contract'
import { definePlugin } from 'drydock'
import type {} from './contract'
import { workerStore } from './store'

export default definePlugin({
  name: 'worker-model',
  description: 'The worker model: the model, effort and speed that worker sub-agents run on, saved in worker-model.json',
  inject: ['paths'],
  uses: { server: 'the settings page cannot read or save the worker model' },
  async apply(ctx) {
    const store = await workerStore(ctx.paths.home)
    ctx.provide('workerModel', { get: store.get })
    ctx.watch('server', server =>
      server?.handle({
        'workerModel.get': store.get,
        'workerModel.save': async ({ model, effort, speed }) => {
          const saved = await store.save({ model, effort, speed })
          server.broadcast('workerModel.change', [saved])
          return saved
        },
      }),
    )
  },
})
