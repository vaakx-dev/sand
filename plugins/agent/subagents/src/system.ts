import type { Session } from '@sand/chats/contract'
import type { Instructions } from '@sand/prompt/contract'
import type { AgentDefinition } from './contract'

const preamble = `You are a sand subagent doing one task for another agent. You have full access to the machine. Nobody will answer questions, so decide yourself.

Finish the task. Your final message is all the other agent sees. Put in what you found or did, with sources, such as file paths or links, and results.`

export const compose = async (definition: AgentDefinition, session: Session, sections?: Instructions, model?: string) => {
  const instructions = await sections?.project(session.cwd, session.project)
  return [
    preamble,
    definition.prompt && `# Your role\n\n${definition.prompt}`,
    sections?.environment(session, model),
    instructions && `# Project instructions\n\n${instructions}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
