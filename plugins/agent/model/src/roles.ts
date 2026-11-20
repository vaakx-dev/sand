import { type LLM, unavailable } from '@sand/accounts/contract'
import { type Role, type RolePicks, roles, type SessionSettings } from './contract'
import { RANKING } from './ranking'

const accountsOf = (llm: LLM, id: string) => {
  const members = llm.members?.(id) ?? []
  return members.length ? members : [llm.find?.(id)]
}

const working = (llm: LLM, id: string) => {
  const out = unavailable(llm)
  const errored = new Set((llm.accounts?.() ?? []).filter(account => account.error).map(account => account.id))
  return accountsOf(llm, id).some(member => member && !out.has(member.source ?? '') && !errored.has(member.source ?? ''))
}

const firstModel = (llm: LLM) => llm.models?.().find(model => !model.hidden)?.id

export const pick = (llm: LLM | undefined, role: Role): SessionSettings => {
  if (!llm) return {}
  const ranked = RANKING[role].find(id => llm.find?.(id) && working(llm, id))
  const model = ranked ? llm.find?.(ranked)?.id : firstModel(llm)
  return model ? { model } : {}
}

export const picks = (llm: LLM | undefined): RolePicks => Object.fromEntries(roles.map(role => [role, pick(llm, role)]))
