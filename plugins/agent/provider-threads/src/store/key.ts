import type { ConversationRef } from '@sand/engine/contract'

export const keyOf = ({ owner, id }: ConversationRef) => ({ owner, conversation: id })

export type Key = ReturnType<typeof keyOf>
