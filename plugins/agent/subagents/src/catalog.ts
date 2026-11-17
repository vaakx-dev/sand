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
  `Start a subagent: an agent with its own chat that works on one task in the background and reports its final reply back to you. Suits broad searches, parallel work, or anything that would flood your context. Several calls in one response run in parallel. Use this for work you hand off; start a thread with thread_start only when the user asks for one.\n\nHand easy work to a lighter level so it doesn't run on your model: sub for routine edits and clear jobs; light for finding files, docs and web pages and for basic computer use. Keep hard thinking, like where a bug is, for yourself.${agentList(definitions)}${modelList(llm)}`
