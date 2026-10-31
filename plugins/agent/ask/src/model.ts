import type { LLM } from '@sand/accounts/contract'
import { matchModel } from '@sand/accounts/match'
import type { Session } from '@sand/chats/contract'
import type { ModelSettings } from '@sand/model/contract'

const configured = (llm: LLM, query: string | undefined) => {
  if (!query) return undefined
  try {
    return matchModel(query, llm.models?.() ?? [], llm.find)
  } catch {
    return undefined
  }
}

export const chooseModel = (llm: LLM, settings: ModelSettings | undefined, query: string | undefined, session: Session | undefined) => {
  const model = configured(llm, query) ?? (session ? settings?.effective(session).model : undefined) ?? settings?.defaults().model
  if (!model) throw new Error('No model chosen. Pick one in the model picker next to send, or set a default in Settings › Models.')
  return model
}
