import type { LLM } from '@sand/llm-accounts/contract'
import type { AgentDefinition } from './contract'

const agentList = (definitions: AgentDefinition[]) =>
  definitions.map(definition => `- ${definition.name}: ${definition.description}`).join('\n')

const modelList = (llm: LLM | undefined) => {
  const models = llm?.models?.() ?? []
  const unique = models.filter((model, index) => models.findIndex(other => other.label === model.label) === index)
  if (!unique.length) return ''
  const names = unique.map(model => `${model.label}${model.summary ? ` (${model.summary})` : ''}`)
  return `\n\nAvailable models: ${names.join(', ')}. Use a smaller model for mechanical search and bulk reading; keep the default for judgement-heavy work.`
}

export const describeAgents = (definitions: AgentDefinition[], llm: LLM | undefined) =>
  `Delegate a task to a subagent. Use for broad searches, parallel work, or anything that would flood your context. Only its final report comes back. Several calls in one response run in parallel.

Available agents:
${agentList(definitions)}${modelList(llm)}`
