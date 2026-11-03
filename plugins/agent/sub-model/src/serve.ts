import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { helloSubModel, subModelChange, type SubModelState, subModelSet, subModelSkill } from './contract'
import { put, type Saved, type Store } from './store'

export const serveSubModel = (server: Server, store: Store, state: () => SubModelState) => {
  const save = async (next: Saved) => {
    await store.save(next)
    server.broadcast(subModelChange, state())
  }
  return joinDisposers(
    server.hello(helloSubModel, state),
    server.handle(subModelSet, ({ tier, model }) => save({ ...store.get(), models: put(store.get().models, tier, model) })),
    server.handle(subModelSkill, ({ job, skill }) => save({ ...store.get(), skills: put(store.get().skills, job, skill) })),
  )
}
