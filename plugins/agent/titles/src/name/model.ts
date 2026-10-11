import type { LLM } from '@sand/llm-accounts/contract'
import type { TitleSettings } from '../contract'

const smallHints = ['haiku', 'mini']

const find = (llm: LLM, id?: string) => llm.models?.().find(model => model.id === id)

const small = (llm: LLM) => {
  const models = llm.models?.() ?? []
  for (const hint of smallHints) {
    const found = models.find(model => model.id.includes(hint))
    if (found) return found.id
  }
  return undefined
}

export const namingModel = (llm: LLM | undefined, saved?: string, fallback?: string) =>
  llm ? (find(llm, saved)?.id ?? small(llm) ?? fallback) : undefined

export const namingChoice = (llm: LLM, { model: saved, effort, speed }: TitleSettings, fallback?: string) => {
  const model = namingModel(llm, saved, fallback)
  const info = find(llm, model)
  return {
    model,
    ...(effort && info?.efforts.includes(effort) && { effort }),
    ...(speed === 'fast' && info?.fast && { speed }),
  }
}
