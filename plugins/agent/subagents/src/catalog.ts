import type { LLM } from '@sand/accounts/contract'
import type { AgentDefinition } from './contract'

const agentList = (definitions: AgentDefinition[]) =>
  definitions.length ? `\n\nAgents you can name:\n${definitions.map(definition => `- ${definition.name}: ${definition.description}`).join('\n')}` : ''

const modelList = (llm: LLM | undefined) => {
  const models = (llm?.models?.() ?? []).filter(model => !model.hidden)
  const unique = models.filter((model, index) => models.findIndex(other => other.label === model.label) === index)
  if (!unique.length) return ''
  const names = unique.map(model => `${model.label}${model.summary ? ` (${model.summary})` : ''}`)
  return `\n\nAvailable models: ${names.join(', ')}.`
}

export const describeAgents = (definitions: AgentDefinition[], llm: LLM | undefined) =>
  `Hand off a task to a subagent that works in its own chat in the background and reports back. Suits broad searches, parallel work, or anything that would flood your context; calls in one response run in parallel. Give easy work a lighter level: sub for routine edits, light for finding things.${agentList(definitions)}${modelList(llm)}`
