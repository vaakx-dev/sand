import type { LLMRequest } from '@sand/accounts/contract'
import type { StepDone } from '@sand/engine/contract'
import { tokensOf } from '@sand/usage/contract'
import { messagesTokens, requestTokens } from './estimate'

interface Known {
  thread?: string
  count: number
  tokens: number
}

export const contextUsed = ({ usage, context }: StepDone) => context?.used ?? tokensOf(usage)

export const createTracker = () => {
  const known = new Map<string, Known>()

  return {
    done(session: string, request: LLMRequest, tokens: number) {
      known.set(session, { ...(request.thread && { thread: request.thread.id }), count: request.messages.length + 1, tokens })
    },
    fitted: (session: string) => known.get(session)?.tokens,
    reset(session: string) {
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
