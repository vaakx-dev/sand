import type { SessionInfo, ThreadLink } from './contract'

export type SessionRow = Omit<SessionInfo, 'creator'> & { creator: string | null }

export const withCreator = <R extends SessionRow>({ creator, ...row }: R) => ({ ...row, ...(creator && { creator: JSON.parse(creator) as ThreadLink }) })

export const creatorText = (creator: ThreadLink | undefined) => (creator ? JSON.stringify(creator) : null)
