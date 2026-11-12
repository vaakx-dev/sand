import { type LLM, matchModel, modelSource, sourceBilling } from '@sand/accounts/contract'
import type { Asked, SettingsPatch } from './contract'
import { asEffort, effortIds, modelOf } from './effective'

const preferred = (llm: LLM | undefined, near: string | undefined) => {
  const model = modelOf(llm, near)
  return model && modelSource(model)
}

const modelNamed = (llm: LLM | undefined, query: string, near: string | undefined) =>
  matchModel(query, llm?.models?.() ?? [], { find: llm?.find, prefer: preferred(llm, near), billing: sourceBilling(llm) })

const effortNamed = (llm: LLM | undefined, word: string) => {
  const level = asEffort(llm, word)
  if (!level) throw new Error(`effort must be one of ${effortIds(llm).join(', ')}`)
  return level
}

export const matchSettings = ({ model, effort, speed }: Asked, llm: LLM | undefined, near?: string): SettingsPatch => ({
  ...(model !== undefined && { model: model === null ? null : modelNamed(llm, model, near) }),
  ...(effort !== undefined && { effort: effort === null ? null : effortNamed(llm, effort) }),
  ...(speed !== undefined && { speed }),
})
