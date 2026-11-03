import { ask } from '@sand/ask/contract'
import { modelSettings } from '@sand/model/contract'
import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { skills } from '@sand/skills/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { subModel, subModelChange } from './contract'
import { serveSubModel } from './serve'
import { createSubModel } from './service'
import { createStore } from './store'

export default definePlugin({
  name: 'sub-model',
  description: 'A small, cheap model other plugins use for background jobs, with a skill the user can pick for each job',
  inject: { ask, paths },
  async apply(ctx) {
    const store = await createStore(join(ctx.paths.home, 'sub-model.json'))
    const sub = createSubModel({
      ask: ctx.ask,
      store,
      modelSettings: () => ctx.get(modelSettings),
      skills: () => ctx.get(skills),
      changed: state => ctx.get(server)?.broadcast(subModelChange, state),
    })
    ctx.provide(subModel, sub.service)
    ctx.watch(server, found => (found ? serveSubModel(found, store, sub.state) : undefined))
  },
})
