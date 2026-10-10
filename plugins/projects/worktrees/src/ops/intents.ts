import type { WorktreeIntent } from '../contract'
import type { UserContent } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import { samePath } from '@sand/kit/fs'
import { repoOf, within } from '../git/repo'
import { forgetMarks } from './marks'
import { startInWorktree } from './start'
import { openSession, type Ops } from './types'

const useExisting = async (ops: Ops, session: Session, path: string) => {
  const repo = await repoOf(session.cwd)
  const found = repo?.checkouts.find(checkout => samePath(checkout.path, path))
  if (!repo || !found) throw new Error(`${path} isn't a worktree of this project`)
  session.relocate(within(repo.root, session.cwd, found.path))
  forgetMarks()
}

export const createIntents = (ops: Ops) => {
  const waiting = new Map<string, string | undefined>()
  return {
    async intend(id: unknown, intent: WorktreeIntent) {
      const session = openSession(ops, id)
      if (session.head) throw new Error('This thread has already started')
      if (intent.mode === 'existing') return useExisting(ops, session, String(intent.path))
      waiting.set(session.id, intent.base)
    },
    async apply(content: UserContent[], session: Session) {
      if (!waiting.has(session.id)) return content
      const base = waiting.get(session.id)
      waiting.delete(session.id)
      await startInWorktree(ops, session, base).catch(() => {})
      return content
    },
  }
}

export type Intents = ReturnType<typeof createIntents>
