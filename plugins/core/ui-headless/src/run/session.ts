import type { Cli } from '@sand/protocol'
import type { Sessions } from '@sand/sessions-sqlite/contract'

export const existingSession = (sessions: Sessions, cli: Cli) => {
  const { resume, continue: latest } = cli.flags
  if (resume) {
    const session = sessions.open(resume)
    if (!session) throw new Error(`No thread with id ${resume}`)
    return session
  }
  const recent = latest ? sessions.list().find(session => session.cwd === cli.cwd && session.kind !== 'agent') : undefined
  return recent && sessions.open(recent.id)
}

export const chooseSession = (sessions: Sessions, cli: Cli) => existingSession(sessions, cli) ?? sessions.create({ cwd: cli.cwd })
