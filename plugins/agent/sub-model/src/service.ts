import type { Ask, AskRequest } from '@sand/ask/contract'
import type { ModelSettings, SessionSettings } from '@sand/model/contract'
import type { ChosenModel, JobRequest, SubModel, SubModelState, Tier } from './contract'
import { put, type Saved, type Store } from './store'

interface SubModelDeps {
  ask: Ask
  store: Store
  modelSettings(): ModelSettings | undefined
  changed(state: SubModelState): void
}

const noModel = 'No model chosen. Set a default or a sub model in Settings › Models.'

export const createSubModel = ({ ask, store, modelSettings, changed }: SubModelDeps) => {
  const save = async (next: Saved) => {
    await store.save(next)
    changed(next)
  }

  const settings = (tier: Tier): SessionSettings => {
    const own = store.get().models[tier]
    if (own) return own
    const fallback = modelSettings()?.defaults().model
    return fallback ? { model: fallback } : {}
  }

  const askRequest = ({ tier, ...request }: JobRequest): AskRequest => {
    const { model, effort, speed } = settings(tier)
    if (!model) throw new Error(noModel)
    return { ...request, model, ...(effort && { effort }), ...(speed && { speed }) }
  }

  const service: SubModel = {
    has: tier => Boolean(store.get().models[tier]),
    settings,
    text: async request => ask.text(askRequest(request)),
    json: async (request, schema) => ask.json(askRequest(request), schema),
  }

  return {
    service,
    state: store.get,
    choose: (tier: Tier, model: ChosenModel | null) => save({ models: put(store.get().models, tier, model) }),
  }
}
