import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { helloSubModel, type SubModelState, subModelSet, subModelSkill } from './contract'
import { put, type Store } from './store'

export const serveSubModel = (server: Server, store: Store, state: () => SubModelState, changed: () => void) =>
  joinDisposers(
    server.hello(helloSubModel, state),
    server.handle(subModelSet, async ({ tier, model }) => {
      await store.save({ ...store.get(), models: put(store.get().models, tier, model) })
      changed()
    }),
    server.handle(subModelSkill, async ({ job, skill }) => {
      await store.save({ ...store.get(), skills: put(store.get().skills, job, skill) })
      changed()
    }),
  )
