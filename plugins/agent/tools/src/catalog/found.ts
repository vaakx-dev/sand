import type { Message } from '@sand/chats/contract'

export const foundIn = (messages: Message[]) =>
  new Set(
    messages.flatMap(message =>
      message.content.flatMap(block =>
        block.type === 'tool_result' ? block.content.flatMap(item => (item.type === 'tool_reference' ? [item.name] : [])) : [],
      ),
    ),
  )
