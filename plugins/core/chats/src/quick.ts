import { retryLocked } from '@sand/util/fs'
import { mkdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { type ChatKind, type Entry, type Message, quickTitle, type Session } from './contract'

const TITLED: ReadonlySet<ChatKind> = new Set(['thread', 'quick'])

export const firstTitle = (session: Session, entry: Entry) => {
  if (!TITLED.has(session.kind) || session.title !== '' || entry.type !== 'message') return undefined
  return quickTitle(entry.data as Message) || undefined
}

export const quickTasks = (scratch: (id: string) => string) => ({
  folder(id: string) {
    const path = scratch(id)
    mkdirSync(path, { recursive: true })
    return path
  },
  removeFolder: (id: string) => retryLocked(() => rm(scratch(id), { recursive: true, force: true })),
})
