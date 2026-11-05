import type { Session } from '@sand/chats/contract'
import type { Instructions } from './instructions'

export const compose = async (instructions: Instructions, session: Session, base: string[], model: string) => {
  const projectInstructions = await instructions.project(session.cwd, session.project)
  return [
    ...base,
    instructions.environment(session, model),
    projectInstructions && `# Project instructions\n\n${projectInstructions}`,
    instructions.additional && `# Additional instructions\n\n${instructions.additional}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
