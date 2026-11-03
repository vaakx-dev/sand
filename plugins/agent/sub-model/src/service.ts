import type { Ask, AskRequest } from '@sand/ask/contract'
import type { ModelSettings, SessionSettings } from '@sand/model/contract'
import type { Skills } from '@sand/skills/contract'
import type { Job, JobRequest, SubModel, Tier } from './contract'
import type { Store } from './store'

export interface SubModelDeps {
  ask: Ask
  store: Store
  modelSettings(): ModelSettings | undefined
  skills(): Skills | undefined
  changed(): void
}

const noModel = 'No model chosen. Set a default or a sub model in Settings › Models.'

export const createSubModel = ({ ask, store, modelSettings, skills, changed }: SubModelDeps) => {
  const jobs = new Map<string, Job>()

  const settings = (tier: Tier): SessionSettings => {
    const own = store.get().models[tier]
    if (own) return own
    const fallback = modelSettings()?.defaults().model
    return fallback ? { model: fallback } : {}
  }

  const skillBody = async (job: string, cwd: string | undefined) => {
    const name = store.get().skills[job]
    if (!name) return undefined
    const found = await skills()?.list(cwd)
    return found?.find(skill => skill.name === name)?.body
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
      changed()
      return () => {
        if (jobs.get(job.id) !== job) return
        jobs.delete(job.id)
        changed()
      }
    },
    has: tier => Boolean(store.get().models[tier]),
    settings,
    text: async request => ask.text(await askRequest(request)),
    json: async (request, schema) => ask.json(await askRequest(request), schema),
  }

  return { service, jobs: () => [...jobs.values()] }
}
