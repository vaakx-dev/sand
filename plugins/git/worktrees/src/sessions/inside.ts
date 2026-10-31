import type { Sessions, SessionSummary } from '@sand/chats/contract'
import { isWithin } from '@sand/util/fs'

export const threads = (sessions: Sessions) => sessions.list().filter(session => session.kind === 'thread')

export const threadsIn = (sessions: Sessions, path: string): SessionSummary[] => threads(sessions).filter(session => isWithin(session.cwd, path))

export const withSessions = (ids: string[], more: string[]) => [...new Set([...ids, ...more])]
