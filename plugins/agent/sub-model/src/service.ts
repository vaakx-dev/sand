import type { Ask, AskRequest } from '@sand/ask/contract'
import type { ModelSettings, SessionSettings } from '@sand/model/contract'
import type { Skills } from '@sand/skills/contract'
import type { ChosenModel, Job, JobRequest, SubModel, SubModelState, Tier } from './contract'
import { put, type Saved, type Store } from './store'

interface SubModelDeps {
  ask: Ask
  store: Store
  modelSettings(): ModelSettings | undefined
  skills(): Skills | undefined
  changed(state: SubModelState): void
}

const noModel = 'No model chosen. Set a default or a sub model in Settings › Models.'

export const createSubModel = ({ ask, store, modelSettings, skills, changed }: SubModelDeps) => {
  const jobs = new Map<string, Job>()
  const state = (): SubModelState => ({ ...store.get(), jobs: [...jobs.values()] })

  const save = async (next: Saved) => {
    await store.save(next)
    changed(state())
  }

  const settings = (tier: Tier): SessionSettings => {
    const own = store.get().models[tier]
    if (own) return own
    const fallback = modelSettings()?.defaults().model
    return fallback ? { model: fallback } : {}
  }

  const skillBody = async (job: string, cwd: string | undefined) => {
    const name = store.get().skills[job]
    if (!name) return undefined
    const found = (await skills()?.list(cwd))?.find(skill => skill.name === name)
    if (!found) throw new Error(`The skill "${name}" picked for this job isn't available here. Pick another in Settings › Models.`)
    return found.body
  }

  const askRequest = async ({ job, tier, cwd, ...request }: JobRequest): Promise<AskRequest> => {
    const { model, effort, speed } = settings(tier)
    if (!model) throw new Error(noModel)
    const skill = await skillBody(job, cwd)
    return { ...request, ...(skill && { system: `${request.system}\n\n${skill}` }), model, ...(effort && { effort }), ...(speed && { speed }) }
  }

  const service: SubModel = {
    job(job) {
      jobs.set(job.id, job)
      changed(state())
      return () => {
        if (jobs.get(job.id) !== job) return
        jobs.delete(job.id)
        changed(state())
      }
    },
    has: tier => Boolean(store.get().models[tier]),
    settings,
    text: async request => ask.text(await askRequest(request)),
    json: async (request, schema) => ask.json(await askRequest(request), schema),
  }

  return {
    service,
    state,
    choose: (tier: Tier, model: ChosenModel | null) => save({ ...store.get(), models: put(store.get().models, tier, model) }),
    pick: (job: string, skill: string | null) => save({ ...store.get(), skills: put(store.get().skills, job, skill) }),
  }
}
