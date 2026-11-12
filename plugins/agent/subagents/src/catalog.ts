import type { LLM } from '@sand/accounts/contract'
import type { AgentDefinition } from './contract'

const agentList = (definitions: AgentDefinition[]) =>
  definitions.length ? `\n\nAgents you can name:\n${definitions.map(definition => `- ${definition.name}: ${definition.description}`).join('\n')}` : ''

const modelList = (llm: LLM | undefined) => {
  const models = (llm?.models?.() ?? []).filter(model => !model.hidden)
  const unique = models.filter((model, index) => models.findIndex(other => other.label === model.label) === index)
  if (!unique.length) return ''
  const names = unique.map(model => `${model.label}${model.summary ? ` (${model.summary})` : ''}`)
  return `\n\nAvailable models: ${names.join(', ')}. Use a smaller model for mechanical search and bulk reading; keep the default for judgement-heavy work.`
}

export const describeAgents = (definitions: AgentDefinition[], llm: LLM | undefined) =>
  `Start a subagent: an agent with its own chat that works on one task in the background and reports its final reply back to you. Suits broad searches, parallel work, or anything that would flood your context. Several calls in one response run in parallel. Use this for work you hand off; start a thread with thread_start only when the user asks for one.${agentList(definitions)}${modelList(llm)}`
