import type { Message, Thread } from '@sand/protocol'
import { walk } from './store'

export const turnStart = (thread: Thread) =>
  walk(thread.entries, thread.info.head)
    .filter(entry => entry.type === 'message' && (entry.data as Message).role === 'user')
    .at(-1)?.at

