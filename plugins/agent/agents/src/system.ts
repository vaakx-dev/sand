import type { Instructions } from '@sand/context-default/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { AgentDefinition } from './contract'

const preamble = `You are a sand subagent doing one task for another agent. You have full access to the machine. Nobody will answer questions, so decide yourself.

Finish the task. Your final message is all the other agent sees. Put in what you found or did, with file paths, line numbers and results.`

export const compose = async (
  definition: AgentDefinition,
  { cwd, project }: Pick<Session, 'cwd' | 'project'>,
  sections?: Instructions,
  model?: string,
) => {
  const instructions = await sections?.project(cwd, project)
  return [
    preamble,
    definition.prompt && `# Your role\n\n${definition.prompt}`,
    sections?.environment(cwd, model),
    instructions && `# Project instructions\n\n${instructions}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
