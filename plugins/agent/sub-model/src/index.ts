import { ask } from '@sand/ask/contract'
import { modelSettings } from '@sand/model/contract'
import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { helloSubModel, subModel, subModelChange, subModelSet } from './contract'
import { createSubModel } from './service'
import { createStore } from './store'

export default definePlugin({
  name: 'sub-model',
  description: 'A small, cheap model other plugins use for background jobs',
  inject: { ask, paths },
  async apply(ctx) {
    const sub = createSubModel({
      ask: ctx.ask,
      store: await createStore(join(ctx.paths.home, 'sub-model.json')),
      modelSettings: () => ctx.get(modelSettings),
      changed: state => ctx.get(server)?.broadcast(subModelChange, state),
    })
    ctx.provide(subModel, sub.service)
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.hello(helloSubModel, sub.state),
            found.handle(subModelSet, ({ tier, model }) => sub.choose(tier, model)),
          )
        : undefined,
    )
  },
})
