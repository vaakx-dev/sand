import type { Message } from '@sand/messages'
import type { Thread } from '../contract'
import { hasToolResult } from '@sand/kit'
import { walk } from './store'

const isPrompt = (message: Message) => message.role === 'user' && !hasToolResult(message)

export const turnStart = (thread: Thread) =>
  walk(thread.entries, thread.info.head)
    .filter(entry => entry.type === 'message' && isPrompt(entry.data as Message))
    .at(-1)?.at
