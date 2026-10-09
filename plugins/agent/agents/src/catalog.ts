import type { LLM } from '@sand/llm-accounts/contract'
import type { AgentDefinition } from './contract'

const agentList = (definitions: AgentDefinition[]) =>
  definitions.map(definition => `- ${definition.name}: ${definition.description}`).join('\n')

const modelList = (llm: LLM | undefined) => {
  const models = llm?.models?.() ?? []
  if (!models.length) return ''
  const lines = models.map(model => `- ${model.label}${model.summary ? `: ${model.summary}` : ''}`)
  return `\n\nAvailable models:\n${lines.join('\n')}\nUse a smaller model for mechanical search and bulk reading; keep the default for judgement-heavy work.`
}

export const catalog = (definitions: AgentDefinition[], llm: LLM | undefined) =>
  `Available agents:\n${agentList(definitions)}${modelList(llm)}`
