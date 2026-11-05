import type { LLMRequest } from '@sand/accounts/contract'
import { messagesTokens, requestTokens } from './estimate'

interface Sent {
  thread?: string
  count: number
}

interface Known extends Sent {
  tokens: number
}

export const createTracker = () => {
  const sent = new Map<string, Sent>()
  const known = new Map<string, Known>()

  return {
    sent(session: string, request: LLMRequest) {
      sent.set(session, { ...(request.thread && { thread: request.thread.id }), count: request.messages.length })
    },
    done(session: string, tokens: number) {
      const last = sent.get(session)
      if (last) known.set(session, { ...last, tokens, count: last.count + 1 })
    },
    reset(session: string) {
      sent.delete(session)
      known.delete(session)
    },
    project(session: string, request: LLMRequest) {
      const last = known.get(session)
      if (!last || last.thread !== request.thread?.id || last.count > request.messages.length) return requestTokens(request)
      return last.tokens + messagesTokens(request.messages.slice(last.count))
    },
  }
}

export type Tracker = ReturnType<typeof createTracker>
