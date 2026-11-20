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
  `Ask a subagent a question or hand it a task, in plain words like "where do we load settings?"; the call returns its answer. It works in your folder and knows what you are working on. Calls in one response run in parallel and return together. Set background for long work you don't need to wait for. Suits broad searches, parallel work, or anything that would flood your context. Give easy work a lighter level: sub for routine edits, light for finding things.${agentList(definitions)}${modelList(llm)}`
