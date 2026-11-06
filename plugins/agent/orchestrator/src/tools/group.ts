import type { ToolContext } from '@sand/tools/contract'

export const group = 'threads'

export const requestOf = ({ conversation, call }: Pick<ToolContext, 'conversation' | 'call'>) => `${conversation.id}:${call.id}`
