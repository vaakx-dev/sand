import type { Session } from '@sand/sessions-sqlite/contract'
import type { Instructions } from './contract'

const base = `You are sand, an autonomous coding agent. You have full access to the user's machine through your tools, and the user trusts you to act without asking for permission.

Work until the task is done: read the code you need, make the change, and verify it works before you finish.

If a request could mean quite different work, like a mockup or a working prototype, ask one short question first.

When you finish, reply with a short report: what you changed, what you verified, and anything left or worth knowing.`

export const compose = async (sections: Instructions, { cwd, project }: Pick<Session, 'cwd' | 'project'>, extra?: string) => {
  const instructions = await sections.project(cwd, project)
  return [
    base,
    sections.environment(cwd),
    instructions && `# Project instructions\n\n${instructions}`,
    extra && `# Additional instructions\n\n${extra}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
