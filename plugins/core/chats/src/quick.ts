import { oneLine } from '@sand/util'
import { promptText } from './prompt'
import { mkdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import type { Entry, Message, Session } from './contract'

const titleLength = 48

export const firstTitle = (session: Session, entry: Entry) => {
  if (session.kind === 'agent' || session.title !== '' || entry.type !== 'message') return undefined
  const message = entry.data as Message
  return message.role === 'user' ? oneLine(promptText(message), titleLength) || undefined : undefined
}

export const quickTasks = (scratch: (id: string) => string) => ({
  folder(id: string) {
    const path = scratch(id)
    mkdirSync(path, { recursive: true })
    return path
  },
  removeFolder: (id: string) => rm(scratch(id), { recursive: true, force: true }),
})
