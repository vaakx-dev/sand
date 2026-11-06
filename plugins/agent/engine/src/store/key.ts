import type { ConversationRef } from '../contract'

export const keyOf = ({ owner, id }: ConversationRef) => ({ owner, conversation: id })
