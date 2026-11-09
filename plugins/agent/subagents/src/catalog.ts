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
  `Delegate a task to a subagent. Use for broad searches, parallel work, or anything that would flood your context. Only its final report comes back. Several calls in one response run in parallel. Each subagent is a thread: message it with thread_send, wait for it with thread_wait and stop it with thread_stop.${agentList(definitions)}${modelList(llm)}`
