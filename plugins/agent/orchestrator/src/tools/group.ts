import type { Session, ToolCallBlock } from '@sand/chats/contract'

export const group = 'threads'

export const requestOf = (session: Session, call: ToolCallBlock) => `${session.id}:${call.id}`
