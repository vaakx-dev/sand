import { existsSync } from 'node:fs'
import type { Message, Relocation, Session } from './contract'
import { noteBlock } from './prompt'
import type { ChatColumns } from './records'

interface RelocateOptions {
  running(id: string): boolean
  children(id: string): { id: string }[]
  patch(id: string, columns: ChatColumns): void
  checked(project: string | null): string | null
  update(session: Session): void
}

export const relocator = ({ running, children, patch, checked, update }: RelocateOptions) => {
  const busy = (id: string): boolean => running(id) || children(id).some(child => busy(child.id))

  return (session: Session, { cwd, project, note }: Relocation) => {
    if (busy(session.id)) throw new Error('Stop the thread first')
    if (!existsSync(cwd)) throw new Error(`${cwd} is not a folder on this PC`)
    const moved = { cwd, project: checked(project) }
    patch(session.id, moved)
    Object.assign(session, moved)
    update(session)
    session.append('message', { role: 'user', content: [noteBlock('sand', note)] } satisfies Message)
    return session
  }
}
