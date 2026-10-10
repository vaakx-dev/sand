import type { LLM } from '@sand/llm-accounts/contract'

const smallHints = ['haiku', 'mini']

const small = (llm: LLM) => {
  const models = llm.models?.() ?? []
  for (const hint of smallHints) {
    const found = models.find(model => model.id.includes(hint))
    if (found) return found.id
  }
  return undefined
}

const available = (llm: LLM, id?: string) => (id && llm.models?.().some(model => model.id === id) ? id : undefined)

export const namingModel = (llm: LLM | undefined, saved?: string, fallback?: string) =>
  llm ? (available(llm, saved) ?? small(llm) ?? fallback) : undefined
