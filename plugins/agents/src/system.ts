import type { AgentDefinition } from '@sand/protocol'
import { environment, projectInstructions } from '@sand/host'

const preamble = `You are a sand subagent: an autonomous agent working on one task delegated by another agent. You have full access to the machine through your tools. Nobody will answer questions, so make reasonable decisions yourself.

Do the task completely. When you finish, reply with a final report for the agent that delegated it: what you found or did, with specific file paths, line numbers and results. Your final message is the only part of your work it will see.`

export const compose = async (definition: AgentDefinition, cwd: string) => {
  const instructions = await projectInstructions(cwd)
  return [
    preamble,
    definition.prompt && `# Your role\n\n${definition.prompt}`,
    environment(cwd),
    instructions && `# Project instructions\n\n${instructions}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
