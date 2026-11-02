import type { Session } from '@sand/chats/contract'
import type { Instructions } from './contract'
import { join } from 'node:path'

const base = Bun.file(join(import.meta.dir, 'system.md')).text()

export const compose = async (instructions: Instructions, session: Session, sections: string[], model?: string) => {
  const projectInstructions = await instructions.project(session.cwd, session.project)
  return [
    (await base).trimEnd(),
    ...sections,
    instructions.environment(session, model),
    projectInstructions && `# Project instructions\n\n${projectInstructions}`,
    instructions.additional && `# Additional instructions\n\n${instructions.additional}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
