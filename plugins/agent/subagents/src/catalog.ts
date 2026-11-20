import type { AgentDefinition } from './contract'

const agentList = (definitions: AgentDefinition[]) =>
  definitions.length ? `\n\nAgents you can name:\n${definitions.map(definition => `- ${definition.name}: ${definition.description}`).join('\n')}` : ''

export const describeAgents = (definitions: AgentDefinition[]) =>
  `Ask a subagent a question or hand it a task, in plain words like "where do we load settings?"; the call returns its answer. It works in your folder and knows what you are working on. Calls in one response run in parallel and return together. Set background for long work you don't need to wait for. Suits broad searches, parallel work, or anything that would flood your context.${agentList(definitions)}`
