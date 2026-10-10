import type { Session } from '@sand/sessions-sqlite/contract'
import { noteBlock } from '@sand/kit'

export const relocate = (session: Session, cwd: string, why: string) => {
  const from = session.cwd
  session.relocate(cwd)
  const text = [why, `Working directory: ${cwd}.`, `Paths under ${from} from earlier in this thread point at the old folder; work in ${cwd} from now on.`].join('\n')
  session.append('message', { role: 'user', content: [noteBlock('sand', text)] })
}
