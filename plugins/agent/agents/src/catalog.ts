import type { LLM } from '@sand/llm-accounts/contract'
import type { AgentDefinition } from './contract'

const agentList = (definitions: AgentDefinition[]) =>
  definitions.map(definition => `- ${definition.name}: ${definition.description}`).join('\n')

const modelList = (llm: LLM | undefined) => {
  const seen = new Set<string>()
  const models = (llm?.models?.() ?? []).filter(model => !seen.has(model.label) && !!seen.add(model.label))
  if (!models.length) return ''
  const names = models.map(model => `${model.label}${model.summary ? ` (${model.summary})` : ''}`)
  return `\n\nAvailable models: ${names.join(', ')}. Use a smaller model for mechanical search and bulk reading; keep the default for judgement-heavy work.`
}

export const catalog = (definitions: AgentDefinition[], llm: LLM | undefined) =>
  `Available agents:\n${agentList(definitions)}${modelList(llm)}`
