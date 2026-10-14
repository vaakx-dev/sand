import type { Session } from '@sand/sessions-sqlite/contract'
import type { Instructions } from './contract'
import { join } from 'node:path'

const base = Bun.file(join(import.meta.dir, 'system.md')).text()

export const compose = async (instructions: Instructions, session: Session, model?: string, extra?: string) => {
  const projectInstructions = await instructions.project(session.cwd, session.project)
  return [
    (await base).trimEnd(),
    instructions.environment(session, model),
    projectInstructions && `# Project instructions\n\n${projectInstructions}`,
    extra && `# Additional instructions\n\n${extra}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
