import type { Sessions } from '@sand/chats/contract'
import type { Turns } from '@sand/turns-contract/contract'
import type { Follows } from './follows'

export interface ArchiveDeps {
  sessions: Sessions
  turns: Turns
  follows: Follows
}

export const createArchive = ({ sessions, turns, follows }: ArchiveDeps) => {
  const ended = new Set<string>()
  const afterTurn = new Set<string>()

  const allEnded = (thread: string) => follows.list(thread).every(pull => ended.has(pull.id))

  const archivable = (thread: string) => {
    const session = sessions.open(thread)
    return session && session.kind !== 'bot' && session.archived === null && allEnded(thread) ? session : undefined
  }

  const settle = async (thread: string) => {
    const session = archivable(thread)
    if (!session) return
    if (turns.current(session)) return void afterTurn.add(thread)
    await sessions.archive(thread, true)
  }

  return {
    end: (watch: string) => void ended.add(watch),
    settle,
    turnEnded: (thread: string) => (afterTurn.delete(thread) ? settle(thread) : undefined),
    forgetWatch: (watch: string) => void ended.delete(watch),
    forgetThread: (thread: string) => void afterTurn.delete(thread),
  }
}

export type Archive = ReturnType<typeof createArchive>
