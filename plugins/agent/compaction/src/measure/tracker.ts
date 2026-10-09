import type { LLMRequest } from '@sand/protocol'
import { messagesTokens, requestTokens } from './estimate'

interface Known {
  tokens: number
  count: number
}

export const createTracker = () => {
  const sent = new Map<string, number>()
  const known = new Map<string, Known>()

  return {
    sent(session: string, count: number) {
      sent.set(session, count)
    },
    done(session: string, tokens: number) {
      const count = sent.get(session)
      if (count !== undefined) known.set(session, { tokens, count: count + 1 })
    },
    reset(session: string) {
      sent.delete(session)
      known.delete(session)
    },
    project(session: string, request: LLMRequest) {
      const last = known.get(session)
      if (!last || last.count > request.messages.length) return requestTokens(request)
      return last.tokens + messagesTokens(request.messages.slice(last.count))
    },
  }
}

export type Tracker = ReturnType<typeof createTracker>
