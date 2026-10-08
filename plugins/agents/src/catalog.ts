import type { Agents, LLM } from '@sand/protocol'

const agentList = (agents: Agents) =>
  agents
    .definitions()
    .map(definition => `- ${definition.name}: ${definition.description}`)
    .join('\n')

const modelList = (llm: LLM | undefined) => {
  const models = llm?.models?.() ?? []
  if (!models.length) return ''
  const lines = models.map(model => `- ${model.label}${model.summary ? `: ${model.summary}` : ''}`)
  return `\n\nAvailable models:\n${lines.join('\n')}\nUse a smaller model for mechanical search and bulk reading; keep the default for judgement-heavy work.`
}

export const catalog = (agents: Agents, llm: LLM | undefined) =>
  `Available agents:\n${agentList(agents)}${modelList(llm)}`
